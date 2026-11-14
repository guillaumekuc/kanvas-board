const { Modal, Notice, Setting } = require('obsidian');
const NameSuggest = require('./NameSuggest.js');

const FORBIDDEN = /[\\/:#^|[\]]/g;

class NamePrompt extends Modal {
  // options: { title, onSubmit, suggestions, overwrite }
  constructor(app, options) {
    super(app);
    this.title = options.title;
    this.onSubmit = options.onSubmit;
    this.options = options;
  }

  onOpen() {
    this.setTitle(this.title);
    this.value = '';
    this.button = null;
    this.suggest = null;
    this.isPicked = false;
    new Setting(this.contentEl)
      .addText((text) => this.addNameField(text))
      .addButton((button) => {
        this.button = button;
        button
          .setButtonText('Create')
          .setCta()
          .onClick(() => this.submit());
      });
  }

  addNameField(text) {
    text.onChange((typed) => {
      this.value = typed;
      this.refresh();
    });
    const { suggestions } = this.options;
    if (suggestions && suggestions.length) {
      this.suggest = new NameSuggest(this.app, text.inputEl, {
        names: suggestions,
        onPick: (suggestion) => this.pick(text, suggestion),
      });
    }
    text.inputEl.addEventListener('keydown', (event) => {
      const suggestEl = this.suggest && this.suggest.suggestEl;
      const isSuggesting = Boolean(suggestEl && suggestEl.isConnected);
      if (event.key !== 'Enter' || this.isPicked || isSuggesting) return;
      event.preventDefault();
      this.submit();
    });
    setTimeout(() => text.inputEl.focus(), 0);
  }

  // The Enter that picked a suggestion does not also submit.
  pick(text, suggestion) {
    text.setValue(suggestion);
    this.value = suggestion;
    this.refresh();
    this.isPicked = true;
    setTimeout(() => {
      this.isPicked = false;
    }, 0);
  }

  // Subfolder names (a/b) are allowed for suggestions only: they name an
  // existing file.
  nameOf(value) {
    const { suggestions } = this.options;
    const typed = value.trim().toLowerCase();
    const isSuggestion =
      suggestions &&
      suggestions.some((suggestion) => suggestion.toLowerCase() === typed);
    return isSuggestion ? value.trim() : value.trim().replace(FORBIDDEN, '');
  }

  refresh() {
    if (!this.button) return;
    const { overwrite } = this.options;
    const isOverwrite = Boolean(
      overwrite && this.value.trim() && overwrite(this.nameOf(this.value)),
    );
    this.button.setButtonText(isOverwrite ? 'Overwrite' : 'Create');
    this.button.buttonEl.toggleClass('mod-warning', isOverwrite);
    this.button.buttonEl.toggleClass('mod-cta', !isOverwrite);
  }

  submit() {
    const name = this.nameOf(this.value);
    if (!name) return;
    this.close();
    Promise.resolve(this.onSubmit(name)).catch(
      (error) => new Notice(`Kanvas board: ${error.message}`),
    );
  }

  onClose() {
    this.contentEl.empty();
  }
}

module.exports = NamePrompt;
