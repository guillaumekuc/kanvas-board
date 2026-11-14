const { AbstractInputSuggest } = require('obsidian');

// Names under a text field that contain what is typed (all of them when it is empty); picking one calls `onPick`.
class NameSuggest extends AbstractInputSuggest {
  constructor(app, inputEl, names, onPick) {
    super(app, inputEl);
    this.names = names;
    this.onPick = onPick;
  }

  getSuggestions(query) {
    query = query.trim().toLowerCase();
    return this.names
      .filter((node) => node.toLowerCase().includes(query))
      .sort((first, second) => first.localeCompare(second));
  }

  renderSuggestion(name, element) {
    element.setText(name);
    element.createSpan({ cls: 'canvas-board-key', text: 'overwrite' });
  }

  selectSuggestion(name) {
    this.onPick(name);
    this.close();
  }
}

module.exports = NameSuggest;
