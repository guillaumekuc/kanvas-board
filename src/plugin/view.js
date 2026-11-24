import * as obsidian from 'obsidian';
import * as shared from './shared.js';

const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;

const EVENTS = ['pointerdown', 'mousedown', 'wheel', 'dblclick', 'contextmenu'];

// Clicks and scrolls stay in the element: no canvas pan, no deselect.
function stopCanvasEvents(element) {
  for (const eventName of EVENTS) {
    element.addEventListener(eventName, (event) => event.stopPropagation());
  }
}

function clearFrames(root) {
  for (const frame of root.querySelectorAll('.kanvas-board-find-text')) {
    const parent = frame.parentNode;
    frame.replaceWith(...frame.childNodes);
    parent.normalize();
  }
}

// Offsets of `query` in `text`, ignoring case.
function matchOffsets(text, query) {
  const pattern = new RegExp(query.replace(REGEX_SPECIAL_CHARS, '\\$&'), 'gi');

  return Array.from(text.matchAll(pattern), (match) => match.index);
}

// Frames every `query` in the text under `root`, as search does in notes. A
// card being edited is left alone: CodeMirror owns its DOM. Returns the frames.
function frameText(root, query) {
  const ownerDocument = root.ownerDocument;
  const walker = ownerDocument.createTreeWalker(root, 4); // text nodes
  const texts = [];
  while (walker.nextNode()) {
    texts.push(walker.currentNode);
  }
  const frames = [];
  for (const node of texts) {
    if (node.parentElement.closest('.cm-editor, input, textarea')) {
      continue;
    }
    const here = [];
    // from the end, so the offsets before stay valid
    for (const offset of matchOffsets(node.data, query).reverse()) {
      const hit = node.splitText(offset);
      hit.splitText(query.length);
      const frame = ownerDocument.createElement('span');
      frame.className = 'kanvas-board-find-text';
      hit.replaceWith(frame);
      frame.append(hit);
      here.unshift(frame);
    }
    frames.push(...here);
  }

  return frames;
}

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
    function button(icon, label, onClick) {
      const buttonEl = buttons.createEl('button', {
        cls: 'document-search-button clickable-icon',
        attr: { 'aria-label': label },
      });
      obsidian.setIcon(buttonEl, icon);
      buttonEl.addEventListener('click', onClick);
    }
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
    obsidian.setIcon(close, 'x');
    close.addEventListener('click', () => this.close());
  }

  bindKeys() {
    // Own key scope while the field has focus: canvas keys (Delete, arrows)
    // stay off, global hotkeys still work.
    this.scope = new obsidian.Scope(this.plugin.app.scope);
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
    if (this.input.value) {
      this.search();
    }
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
    if (!this.matches.length) {
      return;
    }

    this.index =
      (this.index + step + this.matches.length) % this.matches.length;
    this.show();
  }

  // Every match selected (so it can be moved, colored...) and in view; Enter
  // goes back to one at a time.
  selectAll() {
    const { canvas, plugin, matches } = this;
    if (!matches.length) {
      return;
    }
    if (matches.some((node) => plugin.isHidden(canvas, node))) {
      plugin.showAll(canvas);
      new obsidian.Notice(
        'Kanvas board: filter and folds cleared to show the cards',
      );
    }
    for (const node of matches) {
      node.nodeEl.addClass('is-current');
    }
    canvas.updateSelection(() => {
      canvas.selection.clear();
      for (const node of matches) {
        canvas.selection.add(node);
      }
    });
    canvas.zoomToSelection();
    this.countEl.setText(`all ${matches.length}`);
    this.input.focus();
  }

  mark(nodes) {
    for (const node of this.canvas.nodes.values()) {
      node.nodeEl.removeClass('kanvas-board-find-match', 'is-current');
    }
    for (const node of nodes) {
      node.nodeEl.addClass('kanvas-board-find-match');
    }
    this.frame(nodes);
  }

  // Frames the query in the given cards (default: the same ones again) and
  // watches for cards rendering.
  frame(nodes = this.framed) {
    // not nodeEl when there is a choice: it also holds the fold badge
    function root(node) {
      return node.contentEl || node.nodeEl;
    }
    this.observer.disconnect();
    for (const node of this.framed) {
      clearFrames(root(node));
    }
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
    if (!box) {
      return;
    }
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
    if (!node) {
      return;
    }
    for (const matchNode of this.matches) {
      matchNode.nodeEl.toggleClass('is-current', matchNode === node);
    }
    if (plugin.isHidden(canvas, node)) {
      plugin.showAll(canvas);
      new obsidian.Notice(
        'Kanvas board: filter and folds cleared to show the card',
      );
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

// Filter pane in the top-left corner of a canvas, like Graph view's filters:
// closed, a filter button; open, one dot per color and one chip per tag on
// the canvas, all shown at first (click: hide, again: show), the folded
// cards, reset buttons and Show all. Every change applies at once.
// Shift-click on a color, tag or folded card adds its visible cards to the
// selection instead.
class FilterPane {
  constructor(plugin, canvas) {
    this.plugin = plugin;
    this.canvas = canvas;
    this.isOpen = false;
    this.key = '';
    this.element = canvas.wrapperEl.createDiv({ cls: 'kanvas-board-pane' });
    stopCanvasEvents(this.element);
    this.buildHead();
    this.body = this.element.createDiv({ cls: 'kanvas-board-pane-body' });
    this.buildSections();
    this.buildFoot();
    this.toggle(false);
  }

  buildHead() {
    const head = this.element.createDiv({ cls: 'kanvas-board-pane-head' });
    const button = head.createDiv({
      cls: 'clickable-icon',
      attr: {
        'aria-label': this.plugin.keyedLabel('Filter cards', 'filter'),
        'data-tooltip-position': 'right',
      },
    });
    obsidian.setIcon(button, 'filter');
    button.addEventListener('click', () => this.toggle());
    this.badge = head.createSpan({ cls: 'kanvas-board-pane-badge' });
  }

  buildSections() {
    const { plugin, canvas } = this;
    function state() {
      return plugin.viewState(canvas);
    }
    this.colorsEl = this.addSection('Colors', () =>
      state().xcolors.clear(),
    ).createDiv({ cls: 'kanvas-board-chips' });
    this.tagsSection = this.addSection('Tags', () => state().xtags.clear());
    this.tagsEl = this.tagsSection.createDiv({ cls: 'kanvas-board-chips' });
    this.foldedSection = this.addSection('Folded', () => {
      const unfolded = [...plugin.folds(canvas).keys()].map((id) => [id, null]);
      plugin.setFolds(canvas, new Map(unfolded));
    });
    this.foldedEl = this.foldedSection.createDiv({
      cls: 'kanvas-board-pane-list',
    });
  }

  addSection(title, reset) {
    const sectionEl = this.body.createDiv({ cls: 'kanvas-board-pane-section' });
    const headingEl = sectionEl.createDiv({ cls: 'kanvas-board-pane-heading' });
    headingEl.createSpan({ text: title });
    const resetEl = headingEl.createSpan({
      cls: 'clickable-icon kanvas-board-pane-reset',
      attr: { 'aria-label': 'Reset' },
    });
    obsidian.setIcon(resetEl, 'rotate-ccw');
    resetEl.addEventListener('click', () => {
      reset();
      this.plugin.refreshView(this.canvas);
    });

    return sectionEl;
  }

  buildFoot() {
    const foot = this.body.createDiv({ cls: 'kanvas-board-pane-foot' });
    const all = foot.createDiv({
      cls: 'clickable-icon',
      attr: { 'aria-label': 'Unhide all (clear filter and folds)' },
    });
    obsidian.setIcon(all, 'eye');
    all.addEventListener('click', () => this.plugin.showAll(this.canvas));
  }

  tags() {
    const tags = new Set();
    for (const node of this.canvas.nodes.values()) {
      for (const tag of this.plugin.cardTagSet(node)) {
        tags.add(tag);
      }
    }

    return tags;
  }

  toggle(isOpening = !this.isOpen) {
    this.isOpen = isOpening;
    this.element.toggleClass('is-open', isOpening);
    this.key = '';
    this.update();
  }

  colorCounts() {
    const counts = {};
    for (const node of this.canvas.nodes.values()) {
      const data = node.getData();
      if (data.type === 'group') {
        continue;
      }
      counts[data.color || ''] = (counts[data.color || ''] || 0) + 1;
    }

    return counts;
  }

  // Redraws the chips and lists only when something changed (called every
  // 2 s), never the text fields.
  update() {
    const { plugin, canvas } = this;
    const counts = this.colorCounts();
    const folds = plugin.folds(canvas);
    const isActive =
      plugin.filtering(plugin.peekViewState(canvas)) || folds.size > 0;
    this.badge.setText(isActive ? plugin.viewLabel(canvas) : '');
    this.badge.toggle(!this.isOpen && isActive);
    if (!this.isOpen) {
      return;
    }
    const state = plugin.viewState(canvas);
    // A hidden tag stays listed, to show it again.
    const tags = [...new Set([...this.tags(), ...state.xtags])].sort();
    const foldedCards = [...folds.keys()]
      .map((id) => canvas.nodes.get(id))
      .filter(Boolean)
      .map((node) => [node.getData().color, plugin.cardText(node)]);
    const key = JSON.stringify([
      counts,
      [...state.xcolors],
      tags,
      [...state.xtags],
      [...folds],
      foldedCards,
      state.hidden.size,
    ]);
    if (key === this.key) {
      return;
    }
    this.key = key;
    this.renderColors(state, counts);
    this.renderTags(state, tags);
    this.renderFolds(folds);
  }

  toggleIn(set, value) {
    if (set.has(value)) {
      set.delete(value);
    } else {
      set.add(value);
    }
    this.plugin.refreshView(this.canvas);
  }

  selectWhere(keep) {
    const { plugin, canvas } = this;
    if (!plugin.selectMore(canvas, [...canvas.selection], keep)) {
      new obsidian.Notice('Kanvas board: no visible card to select');
    }
  }

  // Dots only, on one line; the name and card count are in the tooltip.
  renderColors(state, counts) {
    this.colorsEl.empty();
    for (const { name, canvasColor: color } of shared.COLORS) {
      const isOut = state.xcolors.has(color);
      const label = this.plugin.colorLabel(name);
      const count = counts[color] || 0;
      const action = isOut ? 'show' : 'hide';
      const chip = this.colorsEl.createDiv({
        cls: 'kanvas-board-swatch',
        attr: {
          'aria-label':
            `${label} · ${count} cards · click to ${action} · shift-click ` +
            `to select`,
        },
      });
      chip.toggleClass('is-out', isOut);
      chip.createSpan({
        cls: 'kanvas-board-dot',
        attr: {
          style: color ? `background: var(--canvas-color-${color})` : '',
        },
      });
      chip.addEventListener('click', (event) =>
        event.shiftKey
          ? this.selectWhere((node) => (node.getData().color || '') === color)
          : this.toggleIn(state.xcolors, color),
      );
    }
  }

  renderTags(state, tags) {
    this.tagsEl.empty();
    this.tagsSection.toggle(tags.length > 0);
    for (const tag of tags) {
      const isOut = state.xtags.has(tag);
      const action = isOut ? 'show' : 'hide';
      const chip = this.tagsEl.createDiv({
        cls: 'kanvas-board-chip',
        text: '#' + tag,
        attr: { 'aria-label': `click to ${action} · shift-click to select` },
      });
      chip.toggleClass('is-out', isOut);
      chip.addEventListener('click', (event) =>
        event.shiftKey
          ? this.selectWhere((node) => this.plugin.cardTagSet(node).has(tag))
          : this.toggleIn(state.xtags, tag),
      );
    }
  }

  renderFolds(folds) {
    this.foldedEl.empty();
    this.foldedSection.toggle(folds.size > 0);
    for (const [id, direction] of folds) {
      const node = this.canvas.nodes.get(id);
      if (node) {
        this.renderFoldRow(node, direction);
      }
    }
  }

  // Color dot, first line as title, the rest muted below, and how many cards
  // the fold hides.
  renderFoldRow(node, direction) {
    const { plugin, canvas } = this;
    const row = this.foldedEl.createDiv({
      cls: 'kanvas-board-pane-row kanvas-board-pane-card',
      attr: {
        'aria-label':
          'Click to unfold the whole branch · shift-click to select the card',
      },
    });
    row.createSpan({
      cls: 'kanvas-board-dot',
      attr: { style: plugin.dotStyle(node.getData().color) },
    });
    const text = row.createDiv({ cls: 'kanvas-board-pane-card-text' });
    const [title, ...rest] = plugin.boardLibrary.plainLines(
      plugin.cardText(node),
    );
    text.createDiv({
      cls: 'kanvas-board-pane-card-title',
      text: title || '(empty)',
    });
    if (rest.length) {
      text.createDiv({
        cls: 'kanvas-board-pane-card-rest',
        text: rest.join(' · '),
      });
    }
    const levels = plugin.branchLevels(canvas, node.id, direction);
    row.createSpan({
      cls: 'kanvas-board-pane-card-count',
      text: `· ${levels.flat().length} folded`,
    });
    row.addEventListener('click', (event) =>
      event.shiftKey
        ? this.selectWhere((each) => each.id === node.id)
        : plugin.unfold(canvas, [node.id], Infinity),
    );
  }

  destroy() {
    this.element.remove();
  }
}

// The ids reached from `root` through `links` (id → ids), level by level
// (level 1 first); each id once, at its nearest level.
function branchLevelsFrom(links, root) {
  const seen = new Set([root]);
  function isNew(id) {
    return !seen.has(id) && Boolean(seen.add(id));
  }
  const levels = [];
  let level = [root];
  while (level.length) {
    level = level.flatMap((id) => links.get(id) || []).filter(isNew);
    if (level.length) {
      levels.push(level);
    }
  }

  return levels;
}

// The selected cards, without edges and groups.
function selectedCards(selection) {
  return selection.filter(
    (node) => !node.from && node.getData().type !== 'group',
  );
}

function isTextNode(node) {
  return node.getData().type === 'text';
}

// What a canvas shows: colors and tags filtered out (x = excluded), cards
// hidden.
function emptyViewState() {
  return { xcolors: new Set(), xtags: new Set(), hidden: new Set() };
}

export {
  stopCanvasEvents,
  clearFrames,
  matchOffsets,
  frameText,
  FindBar,
  FilterPane,
  branchLevelsFrom,
  selectedCards,
  isTextNode,
  emptyViewState,
};
