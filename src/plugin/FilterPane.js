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
    const el = (this.el = canvas.wrapperEl.createDiv({
      cls: 'canvas-board-pane',
    }));
    // Clicks and scrolls stay in the pane (no canvas pan, no deselect).
    for (const ev of [
      'pointerdown',
      'mousedown',
      'wheel',
      'dblclick',
      'contextmenu',
    ]) {el.addEventListener(ev, (e) => e.stopPropagation());}
    const head = el.createDiv({ cls: 'canvas-board-pane-head' });
    const btn = head.createDiv({
      cls: 'clickable-icon',
      attr: {
        'aria-label': plugin.keyedLabel('Filter cards', 'filter'),
        'data-tooltip-position': 'right',
      },
    });
    setIcon(btn, 'filter');
    btn.addEventListener('click', () => this.toggle());
    this.badge = head.createSpan({ cls: 'canvas-board-pane-badge' });
    this.body = el.createDiv({ cls: 'canvas-board-pane-body' });
    const v = () => plugin.viewState(canvas);
    const apply = () => plugin.refreshView(canvas);

    const section = (title, reset) => {
      const s = this.body.createDiv({ cls: 'canvas-board-pane-section' });
      const h = s.createDiv({ cls: 'canvas-board-pane-heading' });
      h.createSpan({ text: title });
      if (reset) {
        const r = h.createSpan({
          cls: 'clickable-icon canvas-board-pane-reset',
          attr: { 'aria-label': 'Reset' },
        });
        setIcon(r, 'rotate-ccw');
        r.addEventListener('click', () => {
          reset();
          apply();
        });
      }
      return s;
    };

    this.colorsEl = section('Colors', () => v().xcolors.clear()).createDiv({
      cls: 'canvas-board-chips',
    });
    this.tagsSection = section('Tags', () => v().xtags.clear());
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
    for (const node of this.canvas.nodes.values()) {for (const t of this.plugin.cardTagSet(node)) tags.add(t);}
    return tags;
  }

  toggle(open = !this.isOpen) {
    this.isOpen = open;
    this.el.toggleClass('is-open', open);
    this.key = '';
    this.update();
  }

  // Redraws the chips and lists only when something changed (called every 2 s), never the text fields.
  update() {
    const { plugin, canvas } = this;
    const v = plugin.viewState(canvas, false);
    const counts = {};
    for (const n of canvas.nodes.values()) {
      const d = n.getData();
      if (d.type !== 'group') {counts[d.color || ''] = (counts[d.color || ''] || 0) + 1;}
    }
    const folds = plugin.folds(canvas);
    const active = plugin.filtering(v) || folds.size > 0;
    this.badge.setText(active ? plugin.viewLabel(canvas) : '');
    this.badge.toggle(!this.isOpen && active);
    if (!this.isOpen) return;
    const state = plugin.viewState(canvas);
    const tags = [...new Set([...this.tags(), ...state.xtags])].sort(); // a hidden tag stays listed, to show it again
    const foldedCards = [...folds.keys()]
      .map((id) => canvas.nodes.get(id))
      .filter(Boolean)
      .map((n) => [n.getData().color, plugin.cardText(n)]);
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
      if (!plugin.selectMore(canvas, [...canvas.selection], keep)) {new Notice('Kanvas board: no visible card to select');}
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
      chip.addEventListener('click', (e) =>
        e.shiftKey
          ? select((n) => (n.getData().color || '') === color)
          : toggle(state.xcolors, color),
      );
    }

    this.tagsEl.empty();
    this.tagsSection.toggle(tags.length > 0);
    for (const t of tags) {
      const out = state.xtags.has(t);
      const chip = this.tagsEl.createDiv({
        cls: 'canvas-board-chip',
        text: '#' + t,
        attr: {
          'aria-label': `click to ${out ? 'show' : 'hide'} · shift-click to select`,
        },
      });
      chip.toggleClass('is-out', out);
      chip.addEventListener('click', (e) =>
        e.shiftKey
          ? select((n) => plugin.cardTagSet(n).has(t))
          : toggle(state.xtags, t),
      );
    }

    this.foldedEl.empty();
    this.foldedSection.toggle(folds.size > 0);
    // Color dot, first line as title, the rest muted below, and how many cards the fold hides.
    for (const [id, dir] of folds) {
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
      const [title, ...rest] = plugin.cb.plainLines(plugin.cardText(node));
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
        text: `· ${plugin.branchLevels(canvas, id, dir).flat().length} folded`,
      });
      row.addEventListener('click', (e) =>
        e.shiftKey
          ? select((n) => n.id === id)
          : plugin.unfold(canvas, [id], Infinity),
      );
    }
  }

  destroy() {
    this.el.remove();
  }
}

module.exports = FilterPane;
