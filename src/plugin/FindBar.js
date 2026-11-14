const { Notice, Scope, setIcon } = require('obsidian');
const clearFrames = require('./clearFrames.js');
const frameText = require('./frameText.js');
const stopCanvasEvents = require('./stopCanvasEvents.js');

// Find bar at the top of a canvas, built with the classes of the notes' find
// bar (document-search-*) so it looks the same: matches are the cards whose
// text (or file, link, group label) contains the query, ignoring case, in
// reading order (top to bottom, then left to right). Typing jumps to the first
// one; Enter / Shift+Enter or the arrows go to the next / previous (it wraps),
// Alt+Enter or the "all" button selects every match and zooms to them all,
// Escape or the cross closes. Every match is outlined, the current one selected
// and zoomed to (a hidden one clears filter and folds first). The text found is
// framed inside the cards, like search in notes; cards render when they come
// into view, so an observer frames them again while there are matches. Keys
// typed in the field never reach the canvas.
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
    this.element = canvas.wrapperEl.createDiv({
      cls: 'document-search-container kanvas-board-find',
    });
    stopCanvasEvents(this.element);
    this.buildBox();
    this.bindKeys();
    this.element.hide();
  }

  buildBox() {
    const box = this.element.createDiv({ cls: 'document-search' });
    const field = (this.field = box.createDiv({
      cls: 'search-input-container document-search-input',
    }));
    this.input = field.createEl('input', {
      type: 'search',
      attr: { placeholder: 'Find…', spellcheck: 'false' },
    });
    // inside the field, as in notes (absolute)
    this.countEl = field.createDiv({ cls: 'document-search-count' });
    const buttons = box.createDiv({ cls: 'document-search-buttons' });
    const button = (icon, label, onClick) => {
      const buttonEl = buttons.createEl('button', {
        cls: 'document-search-button clickable-icon',
        attr: { 'aria-label': label },
      });
      setIcon(buttonEl, icon);
      buttonEl.addEventListener('click', onClick);
    };
    button('arrow-up', 'Previous (Shift+Enter)', () => this.step(-1));
    button('arrow-down', 'Next (Enter)', () => this.step(1));
    const all = buttons.createEl('button', {
      cls: 'document-search-button',
      text: 'All',
      attr: { 'aria-label': 'Select all matches (Alt+Enter)' },
    });
    all.addEventListener('click', () => this.selectAll());
    const close = box.createDiv({
      cls: 'document-search-close-button clickable-icon',
      attr: { 'aria-label': 'Close (Escape)' },
    });
    setIcon(close, 'x');
    close.addEventListener('click', () => this.close());
  }

  bindKeys() {
    // Own key scope while the field has focus: canvas keys (Delete, arrows)
    // stay off, global hotkeys still work.
    this.scope = new Scope(this.plugin.app.scope);
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && event.altKey) {
        event.preventDefault();
        this.selectAll();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        this.step(event.shiftKey ? -1 : 1);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
      }
    });
    this.input.addEventListener('focus', () =>
      this.plugin.app.keymap.pushScope(this.scope),
    );
    this.input.addEventListener('blur', () =>
      this.plugin.app.keymap.popScope(this.scope),
    );
    this.input.addEventListener('input', () => this.search());
  }

  open() {
    this.element.show();
    this.input.focus();
    this.input.select();
    if (this.input.value) this.search();
  }

  close() {
    this.mark([]);
    this.element.hide();
    this.input.blur();
  }

  search() {
    const query = this.input.value.trim().toLowerCase();
    const plugin = this.plugin;
    this.matches = !query
      ? []
      : [...this.canvas.nodes.values()]
          .filter((node) => plugin.cardText(node).toLowerCase().includes(query))
          .sort((first, second) => first.y - second.y || first.x - second.x);
    this.index = this.matches.length ? 0 : -1;
    this.mark(this.matches);
    this.show();
  }

  step(step) {
    if (!this.matches.length) return;
    this.index =
      (this.index + step + this.matches.length) % this.matches.length;
    this.show();
  }

  // Every match selected (so it can be moved, colored...) and in view; Enter
  // goes back to one at a time.
  selectAll() {
    const { canvas, plugin, matches } = this;
    if (!matches.length) return;
    if (matches.some((node) => plugin.isHidden(canvas, node))) {
      plugin.showAll(canvas);
      new Notice('Kanvas board: filter and folds cleared to show the cards');
    }
    for (const node of matches) node.nodeEl.addClass('is-current');
    canvas.updateSelection(() => {
      canvas.selection.clear();
      for (const node of matches) canvas.selection.add(node);
    });
    canvas.zoomToSelection();
    this.countEl.setText(`all ${matches.length}`);
    this.input.focus();
  }

  mark(nodes) {
    for (const node of this.canvas.nodes.values()) {
      node.nodeEl.removeClass('kanvas-board-find-match', 'is-current');
    }
    for (const node of nodes) node.nodeEl.addClass('kanvas-board-find-match');
    this.frame(nodes);
  }

  // Frames the query in the given cards (default: the same ones again) and
  // watches for cards rendering.
  frame(nodes = this.framed) {
    // not nodeEl when there is a choice: it also holds the fold badge
    const root = (node) => node.contentEl || node.nodeEl;
    this.observer.disconnect();
    for (const node of this.framed) clearFrames(root(node));
    this.framed = nodes;
    const query = this.input.value.trim();
    for (const node of nodes) {
      const frames = frameText(root(node), query);
      if (node === this.revealing && frames[0]) {
        this.reveal(frames[0]);
        this.revealing = null;
      }
    }
    if (nodes.length) {
      this.observer.observe(this.canvas.wrapperEl, {
        childList: true,
        subtree: true,
      });
    }
  }

  // Scrolls a long card to its first match. By hand: scrollIntoView would also
  // scroll the canvas itself.
  reveal(frame) {
    const box = frame.closest('.markdown-preview-view');
    if (!box) return;
    const frameBox = frame.getBoundingClientRect(),
      view = box.getBoundingClientRect();
    // on-screen sizes are scaled by the canvas zoom, scrollTop is not
    const zoom = view.height / box.offsetHeight || 1;
    box.scrollTop += (frameBox.top - view.top) / zoom - box.clientHeight / 2;
  }

  show() {
    const { canvas, plugin } = this;
    const query = this.input.value.trim();
    this.countEl.setText(
      !query
        ? ''
        : this.matches.length
          ? `${this.index + 1} / ${this.matches.length}`
          : 'No results',
    );
    this.field.toggleClass('mod-no-match', !!query && !this.matches.length);
    const node = this.matches[this.index];
    if (!node) return;
    for (const matchNode of this.matches) {
      matchNode.nodeEl.toggleClass('is-current', matchNode === node);
    }
    if (plugin.isHidden(canvas, node)) {
      plugin.showAll(canvas);
      new Notice('Kanvas board: filter and folds cleared to show the card');
    }
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
    this.element.remove();
  }
}

module.exports = FindBar;
