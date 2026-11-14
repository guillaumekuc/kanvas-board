const { Modal, Setting } = require('obsidian');

// One-line name prompt; Enter confirms, Escape cancels. Options: `suggestions`
// (names listed as you type, Enter or click picks one into the field) and
// `overwrite` (name → true when it would replace a file: the button then reads
// "Overwrite", in the warning color). Unpack (dissolve) when other cards or
// notes link the subcanvas: group and redirect, keep the file, or break them.
class UnpackChoice extends Modal {
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
    if (count > 8) list.createEl('li', { text: `and ${count - 8} more` });
    const setting = new Setting(this.contentEl);
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

module.exports = UnpackChoice;
