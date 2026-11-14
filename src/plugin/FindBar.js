const { Notice, Scope, setIcon } = require('obsidian');
const clearFrames = require('./clearFrames.js');
const frameText = require('./frameText.js');

// Find bar at the top of a canvas, built with the classes of the notes' find bar (document-search-*) so it looks
// the same: matches are the cards whose text (or file, link, group label) contains the query, ignoring case, in
// reading order (top to bottom, then left to right). Typing jumps to the first one; Enter / Shift+Enter or the
// arrows go to the next / previous (it wraps), Alt+Enter or the "all" button selects every match and zooms to them
// all, Escape or the cross closes. Every match is outlined, the current one selected and zoomed to (a hidden one
// clears filter and folds first). The text found is framed inside the cards, like search in notes; cards render when
// they come into view, so an observer frames them again while there are matches. Keys typed in the field never reach
// the canvas.
class FindBar {
	constructor(plugin, canvas) {
		this.plugin = plugin;
		this.canvas = canvas;
		this.matches = [];
		this.index = -1;
		this.framed = [];
		this.observer = new MutationObserver(() => {
			window.clearTimeout(this.frameTimer);
			this.frameTimer = window.setTimeout(() => this.frame(), 100);
		});
		const el = this.el = canvas.wrapperEl.createDiv({ cls: 'document-search-container canvas-board-find' });
		for (const ev of ['pointerdown', 'mousedown', 'wheel', 'dblclick', 'contextmenu']) el.addEventListener(ev, e => e.stopPropagation());
		const box = el.createDiv({ cls: 'document-search' });
		const field = this.field = box.createDiv({ cls: 'search-input-container document-search-input' });
		this.input = field.createEl('input', { type: 'search', attr: { placeholder: 'Find…', spellcheck: 'false' } });
		this.countEl = field.createDiv({ cls: 'document-search-count' }); // inside the field, as in notes (absolute)
		const buttons = box.createDiv({ cls: 'document-search-buttons' });
		const button = (icon, label, fn) => {
			const b = buttons.createEl('button', { cls: 'document-search-button clickable-icon', attr: { 'aria-label': label } });
			setIcon(b, icon);
			b.addEventListener('click', fn);
		};
		button('arrow-up', 'Previous (Shift+Enter)', () => this.step(-1));
		button('arrow-down', 'Next (Enter)', () => this.step(1));
		const all = buttons.createEl('button', { cls: 'document-search-button', text: 'All', attr: { 'aria-label': 'Select all matches (Alt+Enter)' } });
		all.addEventListener('click', () => this.selectAll());
		const close = box.createDiv({ cls: 'document-search-close-button clickable-icon', attr: { 'aria-label': 'Close (Escape)' } });
		setIcon(close, 'x');
		close.addEventListener('click', () => this.close());
		// Own key scope while the field has focus: canvas keys (Delete, arrows) stay off, global hotkeys still work.
		this.scope = new Scope(plugin.app.scope);
		this.input.addEventListener('keydown', e => {
			if (e.key === 'Enter' && e.altKey) { e.preventDefault(); this.selectAll(); }
			else if (e.key === 'Enter') { e.preventDefault(); this.step(e.shiftKey ? -1 : 1); }
			else if (e.key === 'Escape') { e.preventDefault(); this.close(); }
		});
		this.input.addEventListener('focus', () => plugin.app.keymap.pushScope(this.scope));
		this.input.addEventListener('blur', () => plugin.app.keymap.popScope(this.scope));
		this.input.addEventListener('input', () => this.search());
		el.hide();
	}

	open() {
		this.el.show();
		this.input.focus();
		this.input.select();
		if (this.input.value) this.search();
	}

	close() {
		this.mark([]);
		this.el.hide();
		this.input.blur();
	}

	search() {
		const q = this.input.value.trim().toLowerCase();
		const p = this.plugin;
		this.matches = !q ? [] : [...this.canvas.nodes.values()]
			.filter(n => p.cardText(n).toLowerCase().includes(q))
			.sort((a, b) => a.y - b.y || a.x - b.x);
		this.index = this.matches.length ? 0 : -1;
		this.mark(this.matches);
		this.show();
	}

	step(d) {
		if (!this.matches.length) return;
		this.index = (this.index + d + this.matches.length) % this.matches.length;
		this.show();
	}

	// Every match selected (so it can be moved, colored...) and in view; Enter goes back to one at a time.
	selectAll() {
		const { canvas, plugin, matches } = this;
		if (!matches.length) return;
		if (matches.some(n => plugin.isHidden(canvas, n))) { plugin.showAll(canvas); new Notice('Kanvas board: filter and folds cleared to show the cards'); }
		for (const n of matches) n.nodeEl.addClass('is-current');
		canvas.updateSelection(() => { canvas.selection.clear(); for (const n of matches) canvas.selection.add(n); });
		canvas.zoomToSelection();
		this.countEl.setText(`all ${matches.length}`);
		this.input.focus();
	}

	mark(nodes) {
		for (const n of this.canvas.nodes.values()) n.nodeEl.removeClass('canvas-board-find-match', 'is-current');
		for (const n of nodes) n.nodeEl.addClass('canvas-board-find-match');
		this.frame(nodes);
	}

	// Frames the query in the given cards (default: the same ones again) and watches for cards rendering.
	frame(nodes = this.framed) {
		const root = n => n.contentEl || n.nodeEl; // not nodeEl when there is a choice: it also holds the fold badge
		this.observer.disconnect();
		for (const n of this.framed) clearFrames(root(n));
		this.framed = nodes;
		const q = this.input.value.trim();
		for (const n of nodes) {
			const frames = frameText(root(n), q);
			if (n === this.revealing && frames[0]) { this.reveal(frames[0]); this.revealing = null; }
		}
		if (nodes.length) this.observer.observe(this.canvas.wrapperEl, { childList: true, subtree: true });
	}

	// Scrolls a long card to its first match. By hand: scrollIntoView would also scroll the canvas itself.
	reveal(frame) {
		const box = frame.closest('.markdown-preview-view');
		if (!box) return;
		const at = frame.getBoundingClientRect(), view = box.getBoundingClientRect();
		const zoom = view.height / box.offsetHeight || 1; // on-screen sizes are scaled by the canvas zoom, scrollTop is not
		box.scrollTop += (at.top - view.top) / zoom - box.clientHeight / 2;
	}

	show() {
		const { canvas, plugin } = this;
		const q = this.input.value.trim();
		this.countEl.setText(!q ? '' : this.matches.length ? `${this.index + 1} / ${this.matches.length}` : 'No results');
		this.field.toggleClass('mod-no-match', !!q && !this.matches.length);
		const node = this.matches[this.index];
		if (!node) return;
		for (const n of this.matches) n.nodeEl.toggleClass('is-current', n === node);
		if (plugin.isHidden(canvas, node)) { plugin.showAll(canvas); new Notice('Kanvas board: filter and folds cleared to show the card'); }
		canvas.selectOnly(node);
		canvas.zoomToSelection();
		this.revealing = node;
		this.frame();
		this.input.focus();
	}

	destroy() {
		this.mark([]);
		window.clearTimeout(this.frameTimer);
		this.plugin.app.keymap.popScope(this.scope);
		this.el.remove();
	}
}

module.exports = FindBar;
