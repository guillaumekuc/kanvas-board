import * as obsidian from 'obsidian';

// Names under a text field that contain what is typed (all of them when it is
// empty); picking one calls `onPick`.
class NameSuggest extends obsidian.AbstractInputSuggest {
  constructor(app, inputEl, { names, onPick }) {
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
    element.createSpan({ cls: 'kanvas-board-key', text: 'overwrite' });
  }

  selectSuggestion(name) {
    this.onPick(name);
    this.close();
  }
}

const FORBIDDEN = /[\\/:#^|[\]]/g;

class NamePrompt extends obsidian.Modal {
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
    new obsidian.Setting(this.contentEl)
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
      if (event.key !== 'Enter' || this.isPicked || isSuggesting) {
        return;
      }
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
    if (!this.button) {
      return;
    }

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
    if (!name) {
      return;
    }
    this.close();
    Promise.resolve(this.onSubmit(name)).catch(
      (error) => new obsidian.Notice(`Kanvas board: ${error.message}`),
    );
  }

  onClose() {
    this.contentEl.empty();
  }
}

// Fuzzy pick from `items` (shown by `label`); Enter calls `onChoose`.
class Picker extends obsidian.FuzzySuggestModal {
  constructor(app, { placeholder, items, label, onChoose }) {
    super(app);
    this.setPlaceholder(placeholder);
    this.items = items;
    this.label = label;
    this.onChoose = onChoose;
  }

  getItems() {
    return this.items;
  }
  getItemText(item) {
    return this.label(item);
  }
  onChooseItem(item) {
    Promise.resolve(this.onChoose(item)).catch(
      (error) => new obsidian.Notice(`Kanvas board: ${error.message}`),
    );
  }
}

// One-line name prompt; Enter confirms, Escape cancels. Options: `suggestions`
// (names listed as you type, Enter or click picks one into the field) and
// `overwrite` (name → true when it would replace a file: the button then reads
// "Overwrite", in the warning color). Unpack (dissolve) when other cards or
// notes link the subcanvas: group and redirect, keep the file, or break them.
class UnpackChoice extends obsidian.Modal {
  constructor(app, file, { links, onPick }) {
    super(app);
    this.file = file;
    this.links = links;
    this.onPick = onPick;
  }

  onOpen() {
    const count = this.links.length;
    this.setTitle(
      `${this.file.basename} is linked from ${count} other ` +
        `place${count > 1 ? 's' : ''}`,
    );
    const list = this.contentEl.createEl('ul');
    for (const link of this.links.slice(0, 8)) {
      list.createEl('li', {
        text: link.id ? `${link.label} (${link.path})` : link.path,
      });
    }
    if (count > 8) {
      list.createEl('li', { text: `and ${count - 8} more` });
    }
    const setting = new obsidian.Setting(this.contentEl);
    const pick = (mode) => {
      this.close();
      this.onPick(mode);
    };
    setting.addButton((button) =>
      button
        .setButtonText('Unpack into a group, redirect links')
        .setCta()
        .onClick(() => pick('group')),
    );
    setting.addButton((button) =>
      button.setButtonText('Keep the file (copy)').onClick(() => pick('copy')),
    );
    setting.addButton((button) =>
      button
        .setButtonText('Break links and trash')
        .setWarning()
        .onClick(() => pick('dissolve')),
    );
    setting.addButton((button) =>
      button.setButtonText('Cancel').onClick(() => this.close()),
    );
  }

  onClose() {
    this.contentEl.empty();
  }
}

export { NameSuggest, NamePrompt, Picker, UnpackChoice };
