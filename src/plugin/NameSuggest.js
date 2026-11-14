const { AbstractInputSuggest } = require('obsidian');

// Names under a text field that contain what is typed (all of them when it is empty); picking one calls `onPick`.
class NameSuggest extends AbstractInputSuggest {
	constructor(app, inputEl, names, onPick) {
		super(app, inputEl);
		this.names = names;
		this.onPick = onPick;
	}

	getSuggestions(q) {
		q = q.trim().toLowerCase();
		return this.names.filter(n => n.toLowerCase().includes(q)).sort((a, b) => a.localeCompare(b));
	}

	renderSuggestion(name, el) {
		el.setText(name);
		el.createSpan({ cls: 'canvas-board-key', text: 'overwrite' });
	}

	selectSuggestion(name) {
		this.onPick(name);
		this.close();
	}
}

module.exports = NameSuggest;
