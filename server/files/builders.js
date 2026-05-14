export class ElementBuilder {
  constructor(tag) {
    this.element = document.createElement(tag);
  }
  id(id) { this.element.id = id; return this; }
  className(className) { this.element.className = className; return this; }
  text(text) { this.element.textContent = text; return this; }
  append(child) {
    if (child instanceof ElementBuilder) this.element.appendChild(child.build());
    else if (child instanceof HTMLElement) this.element.appendChild(child);
    return this;
  }
  appendTo(parent) {
    if (parent instanceof HTMLElement) parent.appendChild(this.element);
    else if (typeof parent === "string") document.querySelector(parent).appendChild(this.element);
    return this.element;
  }
  build() { return this.element; }
}

export class ButtonBuilder {
  constructor(text) {
    this.element = document.createElement("button");
    this.element.textContent = text;
  }
  onclick(callback) {
    this.element.onclick = callback;
    return this;
  }
  build() { return this.element; }
}

export class MovieBuilder {
  constructor(movie, onDeleteCallback) {
    this.movie = movie;
    this.onDelete = onDeleteCallback;
    this.element = new ElementBuilder("article").id(movie.imdbID).className("movie-card");
    this.build();
  }

  build() {
    const img = new ElementBuilder("img").build();
    img.src = this.movie.Poster;
    this.element.append(img);

    const content = new ElementBuilder("div").className("movie-content");
    content.append(new ElementBuilder("h2").text(this.movie.Title));

    // Action Buttons oben
    const actionRow = new ElementBuilder("div").className("action-row");
    actionRow.append(new ButtonBuilder("Edit").onclick(() => window.location.href = `edit.html?imdbID=${this.movie.imdbID}`).build());
    actionRow.append(new ButtonBuilder("Delete").onclick(() => {
      if(confirm(`Möchtest du "${this.movie.Title}" löschen?`)) this.onDelete(this.movie.imdbID);
    }).build());
    content.append(actionRow);

    // Scores in Schwarz
    const scoresRow = new ElementBuilder("div").className("scores-row");
    scoresRow.append(new ElementBuilder("span").className("score-black").text(`Metascore: ${this.movie.Metascore}`));
    scoresRow.append(new ElementBuilder("span").className("score-black").text(`IMDb: ${this.movie.imdbRating}/10`));
    content.append(scoresRow);

    content.append(new ElementBuilder("p").className("meta-info").text(`Runtime: ${this.movie.Runtime} min • Released: ${this.movie.Released}`));

    const genreContainer = new ElementBuilder("div").className("genre-container");
    this.movie.Genres.forEach(g => genreContainer.append(new ElementBuilder("span").className("genre-tag").text(g)));
    content.append(genreContainer);

    content.append(new ElementBuilder("p").className("plot").text(this.movie.Plot));

    // Crew Info mit Listen (Dots und untereinander)
    const crew = new ElementBuilder("div").className("crew-info");

    const addList = (label, items) => {
      crew.append(new ElementBuilder("strong").text(label));
      const ul = new ElementBuilder("ul").className("crew-list");
      items.forEach(item => ul.append(new ElementBuilder("li").text(item)));
      crew.append(ul);
    };

    addList("Director:", this.movie.Directors);
    addList("Writers:", this.movie.Writers);
    addList("Actors:", this.movie.Actors);

    content.append(crew);
    this.element.append(content);
  }

  appendTo(parent) { this.element.appendTo(parent); }
}