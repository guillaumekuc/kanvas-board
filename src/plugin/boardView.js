import { setIcon } from 'obsidian';
import { branchLevelsFrom, emptyViewState, FilterPane } from './view.js';

// Mixin: the view state of each open canvas (filter, folds, tag branches,
// stale badges), how it is painted, and the fold and unfold helpers the
// commands use. mixBoardView copies these methods onto CanvasBoardPlugin, so
// `this` is the plugin.
class BoardView {
  // The view state if the canvas has one yet, else an empty one (not kept).
  peekViewState(canvas) {
    return this.views.get(canvas) || emptyViewState();
  }

  // Filter state of an open canvas, made on first use.
  viewState(canvas) {
    const existing = this.views.get(canvas);
    if (existing) return existing;
    const state = emptyViewState();
    this.views.set(canvas, state);
    // Decorator: updateSelection and applyHistory are wrapped, not replaced.
    // Hidden cards never stay selected (select all, drag to select), so Delete
    // never hits a card you can't see.
    const plugin = this;
    const original = canvas.updateSelection;
    canvas.updateSelection = function (callback) {
      const result = original.call(this, () => {
        callback();
        for (const selected of [...this.selection]) {
          if (
            state.hidden.has(selected.id) ||
            (selected.from &&
              (state.hidden.has(selected.from.node.id) ||
                state.hidden.has(selected.to.node.id)))
          ) {
            this.selection.delete(selected);
          }
        }
      });
      plugin.updateCount(); // selected count in the status bar follows at once
      return result;
    };
    // Undo / redo may bring folds back or take them away: redraw at once.
    const history = canvas.applyHistory;
    if (history) {
      canvas.applyHistory = function (...values) {
        const result = history.apply(this, values);
        plugin.refreshView(this);
        return result;
      };
    }
    return state;
  }

  isHidden(canvas, node) {
    return this.peekViewState(canvas).hidden.has(node.id);
  }

  // Clears the filter and unfolds every card (one undo step for the folds).
  showAll(canvas) {
    const state = this.peekViewState(canvas);
    state.xcolors.clear();
    state.xtags.clear();
    const folds = this.folds(canvas);
    if (folds.size) {
      this.setFolds(canvas, new Map([...folds.keys()].map((id) => [id, null])));
    } else this.refreshView(canvas);
  }

  // A fold is stored on the card as "canvasBoard": {"folded": "in" | "out"}
  // (the fold direction). JSON Canvas 1.0 has no such field; other readers
  // ignore it and show every card. Obsidian keeps it (node.unknownData).
  foldOf(node) {
    const boardData = node.getData().canvasBoard;
    return (boardData && boardData.folded) || null;
  }

  folds(canvas) {
    const folds = new Map();
    for (const node of canvas.nodes.values()) {
      const direction = this.foldOf(node);
      if (direction) folds.set(node.id, direction);
    }
    return folds;
  }

  // `changes`: card id → direction to fold, or null to unfold. One canvas edit,
  // one undo step.
  setFolds(canvas, changes) {
    if (!changes.size) return;
    const canvasData = canvas.getData();
    for (const node of canvasData.nodes) {
      if (!changes.has(node.id)) continue;
      const boardData = { ...(node.canvasBoard || {}) };
      const direction = changes.get(node.id);
      if (direction) boardData.folded = direction;
      else delete boardData.folded;
      if (Object.keys(boardData).length) node.canvasBoard = boardData;
      else delete node.canvasBoard;
    }
    this.edit(canvas, [], canvasData);
    this.refreshView(canvas);
  }

  pane(canvas) {
    let pane = this.panes.get(canvas);
    if (!pane) {
      pane = new FilterPane(this, canvas);
      this.panes.set(canvas, pane);
    }
    return pane;
  }

  // Card id → ids one edge away, following edges out (from → to) or in (to →
  // from).
  branchLinks(canvas, direction) {
    const links = new Map();
    for (const edge of canvas.edges.values()) {
      const [source, target] =
        direction === 'in'
          ? [edge.to.node.id, edge.from.node.id]
          : [edge.from.node.id, edge.to.node.id];
      if (source !== target) {
        links.set(source, (links.get(source) || []).concat(target));
      }
    }
    return links;
  }

  // Ids below a folded card, level by level (level 1 first).
  branchLevels(canvas, root, direction) {
    return branchLevelsFrom(this.branchLinks(canvas, direction), root);
  }

  // The cards an unfold on `id` applies to: the card itself if folded, else the
  // nearest folded cards of its open branch (in the fold direction, not past
  // another fold), so pressing unfold again opens the next level.
  unfoldTargets(canvas, id) {
    const node = canvas.nodes.get(id);
    if (!node) return [];
    if (this.foldOf(node)) return [id];
    const links = this.branchLinks(canvas, this.settings.foldDirection);
    const isFolded = (each) => {
      const eachNode = canvas.nodes.get(each);
      return Boolean(eachNode && this.foldOf(eachNode));
    };
    const seen = new Set([id]);
    function isNew(each) {
      return !seen.has(each) && Boolean(seen.add(each));
    }
    const found = [];
    let level = [id];
    while (level.length) {
      const next = level.flatMap((each) => links.get(each) || []).filter(isNew);
      found.push(...next.filter(isFolded));
      level = next.filter((each) => !isFolded(each));
    }
    return found;
  }

  // Shows `levels` levels of each folded branch; the cards at the last shown
  // level that lead further get folded.
  unfold(canvas, ids, levels) {
    const changes = new Map();
    for (const id of ids) {
      const node = canvas.nodes.get(id);
      const direction = node && this.foldOf(node);
      if (!direction) continue;
      changes.set(id, null);
      const below = this.branchLevels(canvas, id, direction);
      const links = this.branchLinks(canvas, direction);
      const lastShown = levels < below.length ? below[levels - 1] : [];
      const leadingFurther = lastShown.filter(
        (each) => (links.get(each) || []).length,
      );
      for (const each of leadingFurther) changes.set(each, direction);
    }
    this.setFolds(canvas, changes);
  }

  // Tags of a card (no #): the `#tags` in its own text, never those of the
  // notes it links. Exact match only: #tag1 is not #tag10.
  cardTagSet(node) {
    const tags = new Set();
    for (const match of (node.getData().text || '').matchAll(
      /(?:^|\s)#([^\s#.,;:!?()[\]{}"'`]+)/g,
    )) {
      if (!/^\d+$/.test(match[1])) tags.add(match[1]);
    }
    return tags;
  }

  // Every color and tag shows by default; a hidden color, or any hidden tag,
  // hides the card.
  matches(node, state) {
    if (state.xcolors.has(node.getData().color || '')) return false;
    if (!state.xtags.size) return true;
    const tags = this.cardTagSet(node);
    return ![...state.xtags].some((tag) => tags.has(tag));
  }

  filtering(state) {
    return !!(state.xcolors.size || state.xtags.size);
  }

  // Hidden = not matching the filter (groups always show), or below a folded
  // card. With the setting "Hide cards under hidden tags", a card hidden by a
  // tag also hides its branch, as a fold in the fold direction would.
  refreshView(canvas) {
    const state = this.viewState(canvas);
    const hidden = new Set([
      ...this.hiddenByFilter(canvas, state),
      ...this.hiddenByTagBranches(canvas, state),
    ]);
    const folded = new Map();
    for (const [root, direction] of this.folds(canvas)) {
      const below = this.branchLevels(canvas, root, direction).flat();
      folded.set(root, below.length);
      for (const id of below) hidden.add(id);
    }
    state.hidden = hidden;
    this.paint(canvas, hidden, folded);
    if ([...canvas.selection].some((selected) => hidden.has(selected.id))) {
      canvas.updateSelection(() => {});
    }
    if (canvas === this.activeCanvas()) this.updateViewLabel(canvas);
    const pane = this.panes.get(canvas);
    if (pane) pane.update();
  }

  hiddenByFilter(canvas, state) {
    if (!this.filtering(state)) return [];
    return [...canvas.nodes.values()]
      .filter((node) => node.getData().type !== 'group')
      .filter((node) => !this.matches(node, state))
      .map((node) => node.id);
  }

  hiddenByTagBranches(canvas, state) {
    if (!state.xtags.size || !this.settings.hideTagBranches) return [];
    function isCard(id) {
      return (
        canvas.nodes.get(id) && canvas.nodes.get(id).getData().type !== 'group'
      );
    }
    const tagged = [...canvas.nodes.values()].filter((node) => {
      const tags = this.cardTagSet(node);
      return [...state.xtags].some((tag) => tags.has(tag));
    });
    return tagged.flatMap((node) =>
      this.branchLevels(canvas, node.id, this.settings.foldDirection)
        .flat()
        .filter(isCard),
    );
  }

  // Hides the `hidden` cards and their edges; `folded` (id → count) gets the "·
  // N folded" badge, a click on it unfolds one level.
  paint(canvas, hidden, folded) {
    for (const node of canvas.nodes.values()) {
      node.nodeEl.toggleClass('kanvas-board-hidden', hidden.has(node.id));
      this.paintFoldBadge(canvas, node, folded.get(node.id));
    }
    this.paintStale(canvas);
    for (const edge of canvas.edges.values()) {
      const isOff =
        hidden.has(edge.from.node.id) || hidden.has(edge.to.node.id);
      const elements = [
        edge.lineGroupEl,
        edge.lineEndGroupEl,
        edge.labelElement && edge.labelElement.wrapperEl,
      ].filter(Boolean);
      for (const element of elements) {
        element.classList.toggle('kanvas-board-hidden', isOff);
      }
    }
  }

  // count: cards folded under the node, undefined when it is not folded.
  paintFoldBadge(canvas, node, count) {
    let badge = node.nodeEl.querySelector(':scope > .kanvas-board-folded');
    if (count === undefined) {
      if (badge) badge.remove();
      return;
    }
    if (!badge) {
      badge = node.nodeEl.createDiv({
        cls: 'kanvas-board-folded',
        attr: { 'data-tooltip-position': 'bottom' },
      });
      for (const eventName of ['pointerdown', 'mousedown', 'dblclick']) {
        badge.addEventListener(eventName, (event) => event.stopPropagation());
      }
      badge.addEventListener('click', (event) => {
        event.stopPropagation();
        this.unfold(canvas, [node.id], 1);
      });
    }
    badge.setText(`· ${count} folded`);
    badge.setAttr('aria-label', this.keyedLabel('Unfold 1 level', 'unfold'));
  }

  // Yellow (needs me) cards whose note was not touched for "Stale after" days:
  // a warning badge (the icon of `- [!]`) with the time since the note last
  // changed. Cards without a note have no date: no badge.
  paintStale(canvas) {
    const days = Number(this.settings.staleDays) || 0;
    const board = canvas.view && canvas.view.file ? canvas.view.file.path : '';
    for (const node of canvas.nodes.values()) {
      const nodeData = node.getData();
      const isWaiting = days > 0 && nodeData.color === '3';
      const age = isWaiting ? this.noteAgeDays(nodeData, board) : -1;
      this.paintStaleBadge(node, { age, days });
    }
  }

  // Days since the card's note (its file, or its first link) last changed;
  // -1 without a note.
  noteAgeDays(nodeData, board) {
    const match =
      nodeData.type === 'text' && /\[\[([^\]|#]+)/.exec(nodeData.text || '');
    const file =
      nodeData.type === 'file'
        ? this.app.vault.getAbstractFileByPath(nodeData.file)
        : match &&
          this.app.metadataCache.getFirstLinkpathDest(match[1].trim(), board);
    if (!file || !file.stat) return -1;
    return Math.floor((Date.now() - file.stat.mtime) / 86400000);
  }

  paintStaleBadge(node, { age, days }) {
    let badge = node.nodeEl.querySelector(':scope > .kanvas-board-stale');
    if (age < days || age < 0) {
      if (badge) badge.remove();
      return;
    }
    if (!badge) {
      badge = node.nodeEl.createDiv({
        cls: 'kanvas-board-stale',
        attr: { 'data-tooltip-position': 'top' },
      });
      setIcon(
        badge.createSpan({ cls: 'kanvas-board-stale-icon' }),
        'triangle-alert',
      );
      badge.createSpan({ cls: 'kanvas-board-stale-text' });
    }
    const label = age < 1 ? 'today' : `${age}d`;
    if (badge.dataset.age === label) return;
    badge.dataset.age = label;
    badge.querySelector('.kanvas-board-stale-text').setText(label);
    const unit = `day${age === 1 ? '' : 's'}`;
    badge.setAttr(
      'aria-label',
      `Waiting on you · note untouched for ${age} ${unit} (stale ` +
        `after ${days})`,
    );
  }

  // Status bar and closed pane: only how many cards are hidden (filter and
  // folds); the pane says by what.
  viewLabel(canvas) {
    const hiddenCount = this.peekViewState(canvas).hidden.size;
    return hiddenCount
      ? `${hiddenCount} card${hiddenCount > 1 ? 's' : ''} hidden`
      : '';
  }

  updateViewLabel(canvas) {
    const label = canvas ? this.viewLabel(canvas) : '';
    this.viewEl.setText(label);
    this.viewEl.toggle(!!label);
  }

  cardText(node) {
    const nodeData = node.getData();
    return String(
      (nodeData.type === 'text'
        ? nodeData.text
        : nodeData.type === 'file'
          ? nodeData.file
          : nodeData.type === 'link'
            ? nodeData.url
            : nodeData.label) || '',
    );
  }

  // Background of a color dot: a preset canvas color ('1'…'6'), a custom hex,
  // or none.
  dotStyle(color) {
    return !color
      ? ''
      : `background: ` +
          `${color.startsWith('#') ? color : `var(--canvas-color-${color})`}`;
  }
}

function mixBoardView(targetClass) {
  for (const name of Object.getOwnPropertyNames(BoardView.prototype)) {
    if (name === 'constructor') continue;
    const descriptor = Object.getOwnPropertyDescriptor(
      BoardView.prototype,
      name,
    );
    Object.defineProperty(targetClass.prototype, name, descriptor);
  }
}

export { mixBoardView };
