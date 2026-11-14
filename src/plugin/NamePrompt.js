const { Modal, Notice, Setting } = require('obsidian');
const NameSuggest = require('./NameSuggest.js');

class NamePrompt extends Modal {
  constructor(app, title, onSubmit, options = {}) {
    super(app);
    this.title = title;
    this.onSubmit = onSubmit;
    this.options = options;
  }

  onOpen() {
    this.setTitle(this.title);
    const { suggestions, overwrite } = this.options;
    let value = '';
    let button,
      suggest,
      isPicked = false;
    const clean = (value) => value.trim().replace(/[\\/:#^|[\]]/g, '');
    // Subfolder names (a/b) are allowed for suggestions only: they name an existing file.
    const nameOf = (value) =>
      suggestions &&
      suggestions.some(
        (suggestion) => suggestion.toLowerCase() === value.trim().toLowerCase(),
      )
        ? value.trim()
        : clean(value);
    const refresh = () => {
      if (!button) return;
      const isOverwrite = !!(
        overwrite &&
        value.trim() &&
        overwrite(nameOf(value))
      );
      button.setButtonText(isOverwrite ? 'Overwrite' : 'Create');
      button.buttonEl.toggleClass('mod-warning', isOverwrite);
      button.buttonEl.toggleClass('mod-cta', !isOverwrite);
    };
    const submit = () => {
      const name = nameOf(value);
      if (!name) return;
      this.close();
      Promise.resolve(this.onSubmit(name)).catch(
        (error) => new Notice(`Kanvas board: ${error.message}`),
      );
    };
    new Setting(this.contentEl)
      .addText((text) => {
        text.onChange((typed) => {
          value = typed;
          refresh();
        });
        if (suggestions && suggestions.length) {
          suggest = new NameSuggest(
            this.app,
            text.inputEl,
            suggestions,
            (suggestion) => {
              text.setValue(suggestion);
              value = suggestion;
              refresh();
              isPicked = true;
              setTimeout(() => {
                isPicked = false;
              }, 0); // the Enter that picked a suggestion does not also submit
            },
          );
        }
        text.inputEl.addEventListener('keydown', (event) => {
          if (
            event.key !== 'Enter' ||
            isPicked ||
            (suggest && suggest.suggestEl && suggest.suggestEl.isConnected)
          ) {
            return;
          }
          event.preventDefault();
          submit();
        });
        setTimeout(() => text.inputEl.focus(), 0);
      })
      .addButton((buttonComponent) => {
        button = buttonComponent;
        buttonComponent.setButtonText('Create').setCta().onClick(submit);
      });
  }

  onClose() {
    this.contentEl.empty();
  }
}

module.exports = NamePrompt;
