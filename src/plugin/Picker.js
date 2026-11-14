const { FuzzySuggestModal, Notice } = require('obsidian');

// Fuzzy pick from `items` (shown by `label`); Enter calls `onChoose`.
class Picker extends FuzzySuggestModal {
  constructor(app, placeholder, items, label, onChoose) {
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
      (error) => new Notice(`Kanvas board: ${error.message}`),
    );
  }
}

module.exports = Picker;
