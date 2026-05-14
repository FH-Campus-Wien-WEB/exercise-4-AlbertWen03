import { ButtonBuilder, ElementBuilder, MovieBuilder } from "./builders.js";

let currentSession = null;

/**
 * Task 1.2: Begrüßung rendern
 */
function renderUserGreeting() {
  const greetingEl = document.getElementById("userGreeting");
  if (currentSession) {
    greetingEl.textContent = `Hi ${currentSession.firstName}, du hast dich am ${currentSession.loginDate} angemeldet.`;
  } else {
    greetingEl.textContent = "";
  }
}

/**
 * Task 1.1: Login Handling
 */
async function handleLogin(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const data = Object.fromEntries(formData.entries());

  const response = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (response.ok) {
    currentSession = await response.json();
    document.getElementById("loginDialog").close();
    updateUI();
    loadMovies();
    loadGenres();
    renderUserGreeting();
  } else {
    alert("Login fehlgeschlagen!");
  }
}

/**
 * Task 2.2: OMDb Suche ausführen
 */
async function searchMovies(event) {
  event.preventDefault();
  const query = document.getElementById("query").value;
  const response = await fetch(`/search?query=${encodeURIComponent(query)}`);
  const results = await response.json();

  const container = document.getElementById("searchResults");
  container.innerHTML = "";

  if (results.length === 0) {
    container.textContent = "Keine Filme gefunden.";
    return;
  }

  // Suchergebnisse wie in image_792794.jpg rendern
  results.forEach(movie => {
    const div = document.createElement("div");
    div.className = "search-result-item";
    div.style.margin = "10px 0";
    div.innerHTML = `
            <span>${movie.Title} (${movie.Year})</span>
            <button type="button" class="add-btn">Add</button>
        `;
    div.querySelector(".add-btn").onclick = () => addMovieFromServer(movie.imdbID, div);
    container.appendChild(div);
  });
}

/**
 * Task 2.3: Film zur Sammlung hinzufügen
 */
async function addMovieFromServer(imdbID, element) {
  const response = await fetch(`/movies/${imdbID}`, { method: 'POST' });
  if (response.ok) {
    element.remove();
    loadMovies();
    loadGenres();
  }
}

/**
 * Steuert die Sichtbarkeit der Buttons
 */
function updateUI() {
  const authBtn = document.getElementById("authBtn");
  const addMoviesBtn = document.getElementById("addMoviesBtn");

  if (currentSession) {
    authBtn.textContent = "Logout";
    authBtn.onclick = () => {
      fetch('/logout').then(() => {
        currentSession = null;
        location.reload(); // Einfachster Weg für Reset
      });
    };
    addMoviesBtn.style.display = "inline-block";
    // Hier wird die Funktion für den Dialog verknüpft!
    addMoviesBtn.onclick = () => {
      document.getElementById("searchDialog").showModal();
    };
  } else {
    authBtn.textContent = "Login";
    authBtn.onclick = () => document.getElementById("loginDialog").showModal();
    addMoviesBtn.style.display = "none";
  }
}

async function loadMovies(genre) {
  if (!currentSession) return;
  let url = "/movies";
  if (genre) url += `?genre=${encodeURIComponent(genre)}`;
  const res = await fetch(url);
  const movies = await res.json();
  const main = document.querySelector("main");
  main.innerHTML = "";
  movies.forEach(m => new MovieBuilder(m, deleteMovie).appendTo(main));
}

async function loadGenres() {
  if (!currentSession) return;
  const res = await fetch("/genres");
  const genres = await res.json();
  const filter = document.getElementById("filter");
  filter.innerHTML = "";

  // "All" Button
  const allLi = document.createElement("li");
  allLi.appendChild(new ButtonBuilder("All").onclick(() => loadMovies()).build());
  filter.appendChild(allLi);

  genres.forEach(g => {
    const li = document.createElement("li");
    li.appendChild(new ButtonBuilder(g).onclick(() => loadMovies(g)).build());
    filter.appendChild(li);
  });
}

async function deleteMovie(imdbID) {
  const res = await fetch(`/movies/${imdbID}`, { method: 'DELETE' });
  if (res.ok) {
    document.getElementById(imdbID).remove();
    loadGenres();
  }
}

// Initialisierung beim Laden der Seite
window.onload = async () => {
  // 1. Session checken
  const res = await fetch('/session');
  const session = await res.json();
  if (session) {
    currentSession = session;
    loadMovies();
    loadGenres();
    renderUserGreeting();
  }
  updateUI();

  // 2. Event Listener binden
  document.getElementById("loginForm").onsubmit = handleLogin;
  document.getElementById("cancelLogin").onclick = () => document.getElementById("loginDialog").close();

  document.getElementById("searchForm").onsubmit = searchMovies;
  document.getElementById("cancelSearch").onclick = () => document.getElementById("searchDialog").close();
};