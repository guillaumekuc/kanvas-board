const { COLORS } = require('./constants.js');
const { Notice, setIcon } = require('obsidian');
const stopCanvasEvents = require('./stopCanvasEvents.js');

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
    setIcon(button, 'filter');
    button.addEventListener('click', () => this.toggle());
    this.badge = head.createSpan({ cls: 'kanvas-board-pane-badge' });
  }

  buildSections() {
    const { plugin, canvas } = this;
    const state = () => plugin.viewState(canvas);
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
    setIcon(resetEl, 'rotate-ccw');
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
    setIcon(all, 'eye');
    all.addEventListener('click', () => this.plugin.showAll(this.canvas));
  }

  tags() {
    const tags = new Set();
    for (const node of this.canvas.nodes.values()) {
      for (const tag of this.plugin.cardTagSet(node)) tags.add(tag);
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
      if (data.type === 'group') continue;
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
    if (!this.isOpen) return;
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
    if (key === this.key) return;
    this.key = key;
    this.renderColors(state, counts);
    this.renderTags(state, tags);
    this.renderFolds(folds);
  }

  toggleIn(set, value) {
    if (set.has(value)) set.delete(value);
    else set.add(value);
    this.plugin.refreshView(this.canvas);
  }

  selectWhere(keep) {
    const { plugin, canvas } = this;
    if (!plugin.selectMore(canvas, [...canvas.selection], keep)) {
      new Notice('Kanvas board: no visible card to select');
    }
  }

  // Dots only, on one line; the name and card count are in the tooltip.
  renderColors(state, counts) {
    this.colorsEl.empty();
    for (const [name, color] of COLORS) {
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
      if (node) this.renderFoldRow(node, direction);
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

module.exports = FilterPane;
