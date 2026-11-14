const { COLORS } = require('./constants.js');
const { Notice, setIcon } = require('obsidian');

// Filter pane in the top-left corner of a canvas, like Graph view's filters: closed, a filter button; open,
// one dot per color and one chip per tag on the canvas, all shown at first (click: hide, again: show), the
// folded cards, reset buttons and Show all. Every change applies at once. Shift-click on a color, tag or folded card
// adds its visible cards to the selection instead.
class FilterPane {
  constructor(plugin, canvas) {
    this.plugin = plugin;
    this.canvas = canvas;
    this.isOpen = false;
    this.key = '';
    const element = (this.element = canvas.wrapperEl.createDiv({
      cls: 'canvas-board-pane',
    }));
    // Clicks and scrolls stay in the pane (no canvas pan, no deselect).
    for (const eventName of [
      'pointerdown',
      'mousedown',
      'wheel',
      'dblclick',
      'contextmenu',
    ]) {
      element.addEventListener(eventName, (event) => event.stopPropagation());
    }
    const head = element.createDiv({ cls: 'canvas-board-pane-head' });
    const button = head.createDiv({
      cls: 'clickable-icon',
      attr: {
        'aria-label': plugin.keyedLabel('Filter cards', 'filter'),
        'data-tooltip-position': 'right',
      },
    });
    setIcon(button, 'filter');
    button.addEventListener('click', () => this.toggle());
    this.badge = head.createSpan({ cls: 'canvas-board-pane-badge' });
    this.body = element.createDiv({ cls: 'canvas-board-pane-body' });
    const viewState = () => plugin.viewState(canvas);
    const apply = () => plugin.refreshView(canvas);

    const section = (title, reset) => {
      const sectionEl = this.body.createDiv({
        cls: 'canvas-board-pane-section',
      });
      const headingEl = sectionEl.createDiv({
        cls: 'canvas-board-pane-heading',
      });
      headingEl.createSpan({ text: title });
      if (reset) {
        const resetEl = headingEl.createSpan({
          cls: 'clickable-icon canvas-board-pane-reset',
          attr: { 'aria-label': 'Reset' },
        });
        setIcon(resetEl, 'rotate-ccw');
        resetEl.addEventListener('click', () => {
          reset();
          apply();
        });
      }
      return sectionEl;
    };

    this.colorsEl = section('Colors', () =>
      viewState().xcolors.clear(),
    ).createDiv({
      cls: 'canvas-board-chips',
    });
    this.tagsSection = section('Tags', () => viewState().xtags.clear());
    this.tagsEl = this.tagsSection.createDiv({ cls: 'canvas-board-chips' });

    this.foldedSection = section('Folded', () =>
      plugin.setFolds(
        canvas,
        new Map([...plugin.folds(canvas).keys()].map((id) => [id, null])),
      ),
    );
    this.foldedEl = this.foldedSection.createDiv({
      cls: 'canvas-board-pane-list',
    });

    const foot = this.body.createDiv({ cls: 'canvas-board-pane-foot' });
    const all = foot.createDiv({
      cls: 'clickable-icon',
      attr: { 'aria-label': 'Unhide all (clear filter and folds)' },
    });
    setIcon(all, 'eye');
    all.addEventListener('click', () => plugin.showAll(canvas));
    this.toggle(false);
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

  // Redraws the chips and lists only when something changed (called every 2 s), never the text fields.
  update() {
    const { plugin, canvas } = this;
    const viewSnapshot = plugin.peekViewState(canvas);
    const counts = {};
    for (const node of canvas.nodes.values()) {
      const data = node.getData();
      if (data.type !== 'group') {
        counts[data.color || ''] = (counts[data.color || ''] || 0) + 1;
      }
    }
    const folds = plugin.folds(canvas);
    const active = plugin.filtering(viewSnapshot) || folds.size > 0;
    this.badge.setText(active ? plugin.viewLabel(canvas) : '');
    this.badge.toggle(!this.isOpen && active);
    if (!this.isOpen) return;
    const state = plugin.viewState(canvas);
    const tags = [...new Set([...this.tags(), ...state.xtags])].sort(); // a hidden tag stays listed, to show it again
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
    const apply = () => plugin.refreshView(canvas);
    const toggle = (set, x) => {
      if (set.has(x)) set.delete(x);
      else set.add(x);
      apply();
    };
    const select = (keep) => {
      if (!plugin.selectMore(canvas, [...canvas.selection], keep)) {
        new Notice('Kanvas board: no visible card to select');
      }
    };

    // Dots only, on one line; the name and card count are in the tooltip.
    this.colorsEl.empty();
    for (const [name, color] of COLORS) {
      const out = state.xcolors.has(color);
      const chip = this.colorsEl.createDiv({
        cls: 'canvas-board-swatch',
        attr: {
          'aria-label': `${plugin.colorLabel(name)} · ${counts[color] || 0} cards · click to ${out ? 'show' : 'hide'} · shift-click to select`,
        },
      });
      chip.toggleClass('is-out', out);
      chip.createSpan({
        cls: 'canvas-board-dot',
        attr: {
          style: color ? `background: var(--canvas-color-${color})` : '',
        },
      });
      chip.addEventListener('click', (event) =>
        event.shiftKey
          ? select((node) => (node.getData().color || '') === color)
          : toggle(state.xcolors, color),
      );
    }

    this.tagsEl.empty();
    this.tagsSection.toggle(tags.length > 0);
    for (const tag of tags) {
      const out = state.xtags.has(tag);
      const chip = this.tagsEl.createDiv({
        cls: 'canvas-board-chip',
        text: '#' + tag,
        attr: {
          'aria-label': `click to ${out ? 'show' : 'hide'} · shift-click to select`,
        },
      });
      chip.toggleClass('is-out', out);
      chip.addEventListener('click', (event) =>
        event.shiftKey
          ? select((node) => plugin.cardTagSet(node).has(tag))
          : toggle(state.xtags, tag),
      );
    }

    this.foldedEl.empty();
    this.foldedSection.toggle(folds.size > 0);
    // Color dot, first line as title, the rest muted below, and how many cards the fold hides.
    for (const [id, direction] of folds) {
      const node = canvas.nodes.get(id);
      if (!node) continue;
      const row = this.foldedEl.createDiv({
        cls: 'canvas-board-pane-row canvas-board-pane-card',
        attr: {
          'aria-label':
            'Click to unfold the whole branch · shift-click to select the card',
        },
      });
      row.createSpan({
        cls: 'canvas-board-dot',
        attr: { style: plugin.dotStyle(node.getData().color) },
      });
      const text = row.createDiv({ cls: 'canvas-board-pane-card-text' });
      const [title, ...rest] = plugin.boardLibrary.plainLines(
        plugin.cardText(node),
      );
      text.createDiv({
        cls: 'canvas-board-pane-card-title',
        text: title || '(empty)',
      });
      if (rest.length) {
        text.createDiv({
          cls: 'canvas-board-pane-card-rest',
          text: rest.join(' · '),
        });
      }
      row.createSpan({
        cls: 'canvas-board-pane-card-count',
        text: `· ${plugin.branchLevels(canvas, id, direction).flat().length} folded`,
      });
      row.addEventListener('click', (event) =>
        event.shiftKey
          ? select((node) => node.id === id)
          : plugin.unfold(canvas, [id], Infinity),
      );
    }
  }

  destroy() {
    this.element.remove();
  }
}

module.exports = FilterPane;
