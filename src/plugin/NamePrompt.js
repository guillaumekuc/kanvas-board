const { Modal, Notice, Setting } = require('obsidian');
const NameSuggest = require('./NameSuggest.js');

class NamePrompt extends Modal {
  constructor(app, title, onSubmit, opts = {}) {
    super(app);
    this.title = title;
    this.onSubmit = onSubmit;
    this.opts = opts;
  }

  onOpen() {
    this.setTitle(this.title);
    const { suggestions, overwrite } = this.opts;
    let value = '';
    let button,
      suggest,
      picked = false;
    const clean = (v) => v.trim().replace(/[\\/:#^|[\]]/g, '');
    // Subfolder names (a/b) are allowed for suggestions only: they name an existing file.
    const nameOf = (v) =>
      suggestions &&
      suggestions.some((s) => s.toLowerCase() === v.trim().toLowerCase())
        ? v.trim()
        : clean(v);
    const refresh = () => {
      if (!button) return;
      const over = !!(overwrite && value.trim() && overwrite(nameOf(value)));
      button.setButtonText(over ? 'Overwrite' : 'Create');
      button.buttonEl.toggleClass('mod-warning', over);
      button.buttonEl.toggleClass('mod-cta', !over);
    };
    const submit = () => {
      const name = nameOf(value);
      if (!name) return;
      this.close();
      Promise.resolve(this.onSubmit(name)).catch(
        (e) => new Notice(`Kanvas board: ${e.message}`),
      );
    };
    new Setting(this.contentEl)
      .addText((t) => {
        t.onChange((v) => {
          value = v;
          refresh();
        });
        if (suggestions && suggestions.length) {
suggest = new NameSuggest(this.app, t.inputEl, suggestions, (v) => {
            t.setValue(v);
            value = v;
            refresh();
            picked = true;
            setTimeout(() => {
              picked = false;
            }, 0); // the Enter that picked does not also submit
          });
}
        t.inputEl.addEventListener('keydown', (e) => {
          if (
            e.key !== 'Enter' ||
            picked ||
            (suggest && suggest.suggestEl && suggest.suggestEl.isConnected)
          ) {return;}
          e.preventDefault();
          submit();
        });
        setTimeout(() => t.inputEl.focus(), 0);
      })
      .addButton((b) => {
        button = b;
        b.setButtonText('Create').setCta().onClick(submit);
      });
  }

  onClose() {
    this.contentEl.empty();
  }
}

module.exports = NamePrompt;
