const express = require("express");
const path = require("path");
const session = require("express-session");
const bodyParser = require("body-parser");
const http = require("http");
const bcrypt = require("bcrypt"); // Erforderlich für Passwort-Hashes

// Modelle und Konfiguration laden
const movieModel = require("./movie-model.js");
const userModel = require("./user-model.js");
const config = require("./config.js");

const app = express();

// Session-Middleware konfigurieren
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "files")));

/**
 * Task 1.3: Middleware zum Schutz der Endpunkte
 */
function requireLogin(req, res, next) {
  if (req.session && req.session.user) {
    next();
  } else {
    res.status(401).send("Unauthorized");
  }
}

// --- AUTHENTIFIZIERUNG ---

/**
 * Task 1.1: Login-Endpunkt mit Bcrypt-Vergleich
 */
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = userModel[username];

  // Überprüfung des Benutzers und des gehashten Passworts
  if (user && await bcrypt.compare(password, user.password)) {
    // Session erstellen
    req.session.user = {
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      loginDate: new Date().toLocaleString('de-DE')
    };
    res.json(req.session.user);
  } else {
    res.status(401).send("Ungültige Zugangsdaten");
  }
});

/**
 * Task 1.3: Logout-Endpunkt
 */
app.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send("Logout fehlgeschlagen");
    res.sendStatus(200);
  });
});

app.get("/session", (req, res) => {
  res.json(req.session.user || null);
});

// --- FILME (GESCHÜTZT DURCH requireLogin) ---

app.get("/movies", requireLogin, (req, res) => {
  const username = req.session.user.username;
  let movies = Object.values(movieModel.getUserMovies(username));

  const queriedGenre = req.query.genre;
  if (queriedGenre) {
    movies = movies.filter(m => m.Genres.includes(queriedGenre));
  }
  res.json(movies);
});

app.get("/movies/:imdbID", requireLogin, (req, res) => {
  const movie = movieModel.getUserMovie(req.session.user.username, req.params.imdbID);
  movie ? res.json(movie) : res.sendStatus(404);
});

app.put("/movies/:imdbID", requireLogin, (req, res) => {
  const username = req.session.user.username;
  movieModel.setUserMovie(username, req.params.imdbID, req.body);
  res.sendStatus(200);
});

/**
 * Task 2.2: OMDb Suche
 */
app.get("/search", requireLogin, (req, res) => {
  const query = req.query.query;
  const url = `http://www.omdbapi.com/?s=${encodeURIComponent(query)}&apikey=${config.omdbApiKey}`;

  http.get(url, apiRes => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      const result = JSON.parse(data);
      if (result.Response === "True") {
        const movies = result.Search.map(m => ({
          Title: m.Title,
          Year: m.Year,
          imdbID: m.imdbID
        }));
        res.json(movies);
      } else {
        res.json([]);
      }
    });
  }).on('error', () => res.status(500).send("API Fehler"));
});

/**
 * Task 2.3: Filmdetails laden und für den User speichern
 */
app.post("/movies/:imdbID", requireLogin, (req, res) => {
  const imdbID = req.params.imdbID;
  const url = `http://www.omdbapi.com/?i=${imdbID}&apikey=${config.omdbApiKey}`;

  http.get(url, apiRes => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      const result = JSON.parse(data);
      const movie = {
        imdbID: result.imdbID,
        Title: result.Title,
        Released: result.Released,
        Runtime: parseInt(result.Runtime) || 0,
        Genres: result.Genre.split(", "),
        Directors: result.Director.split(", "),
        Writers: result.Writer.split(", "),
        Actors: result.Actors.split(", "),
        Plot: result.Plot,
        Poster: result.Poster,
        Metascore: parseInt(result.Metascore) || 0,
        imdbRating: parseFloat(result.imdbRating) || 0
      };
      movieModel.setUserMovie(req.session.user.username, imdbID, movie);
      res.status(201).json(movie);
    });
  });
});

app.delete("/movies/:imdbID", requireLogin, (req, res) => {
  const deleted = movieModel.deleteUserMovie(req.session.user.username, req.params.imdbID);
  res.sendStatus(deleted ? 200 : 404);
});

app.get("/genres", requireLogin, (req, res) => {
  const genres = movieModel.getGenres(req.session.user.username);
  res.json(genres.sort());
});

// Server starten
app.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}/`);
});