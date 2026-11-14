const { Modal, Setting } = require('obsidian');

// One-line name prompt; Enter confirms, Escape cancels. Options: `suggestions` (names listed as you type, Enter
// or click picks one into the field) and `overwrite` (name → true when it would replace a file: the button then
// reads "Overwrite", in the warning color).
// Unpack (dissolve) when other cards or notes link the subcanvas: group and redirect, keep the file, or break them.
class UnpackChoice extends Modal {
	constructor(app, file, links, onPick) {
		super(app);
		this.file = file;
		this.links = links;
		this.onPick = onPick;
	}

	onOpen() {
		const k = this.links.length;
		this.setTitle(`${this.file.basename} is linked from ${k} other place${k > 1 ? 's' : ''}`);
		const ul = this.contentEl.createEl('ul');
		for (const l of this.links.slice(0, 8)) ul.createEl('li', { text: l.id ? `${l.label} (${l.path})` : l.path });
		if (k > 8) ul.createEl('li', { text: `and ${k - 8} more` });
		const s = new Setting(this.contentEl);
		const pick = mode => { this.close(); this.onPick(mode); };
		s.addButton(b => b.setButtonText('Unpack into a group, redirect links').setCta().onClick(() => pick('group')));
		s.addButton(b => b.setButtonText('Keep the file (copy)').onClick(() => pick('copy')));
		s.addButton(b => b.setButtonText('Break links and trash').setWarning().onClick(() => pick('dissolve')));
		s.addButton(b => b.setButtonText('Cancel').onClick(() => this.close()));
	}

	onClose() {
		this.contentEl.empty();
	}
}

module.exports = UnpackChoice;
