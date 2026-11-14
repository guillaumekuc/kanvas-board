const { COLORS, COLOR_NUM, DEFAULTS, LAYOUT_DIRS } = require('./constants.js');
const { Notice, Plugin, setIcon } = require('obsidian');
const boardLibrary = require('./boardLibrary.js');
const COMMAND_GROUPS = require('./commands/index.js');
const createApi = require('./createApi.js');
const createStarterBoard = require('./starterBoard/createStarterBoard.js');
const startApmCounter = require('./startApmCounter.js');
const startPass = require('./startPass.js');
const branchLevelsFrom = require('./branchLevelsFrom.js');
const parseOrNull = require('../board/parseOrNull.js');
const subcanvasLinks = require('./subcanvasLinks.js');
const terminalLaunch = require('./terminalLaunch.js');
const unpackSubcanvas = require('./unpack/unpackSubcanvas.js');
const CanvasBoardSettings = require('./CanvasBoardSettings.js');
const emptyViewState = require('./emptyViewState.js');
const claudeBin = require('./claudeBin.js');
const FilterPane = require('./FilterPane.js');
const fileSystem = require('fs');
const nextTurn = require('./nextTurn.js');
const parseColors = require('./parseColors.js');
const path = require('path');

const CONTROL_BUTTONS = [
  ['find', 'Search current canvas', 'search'],
  ['filter', 'Filter cards', 'filter'],
  ['tidy-layout', 'Tidy layout', 'network'],
];

class CanvasBoardPlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
    this.addSettingTab(new CanvasBoardSettings(this.app, this));
    const pluginDir = path.join(
      this.app.vault.adapter.basePath,
      this.manifest.dir,
    );
    this.boardLibrary = boardLibrary;
    this.apm = startApmCounter(this, pluginDir);
    this.api = createApi(this);
    this.installSkill(pluginDir);
    this.addCommand({
      id: 'reset-skill',
      name: "Reset agent skill to the plugin's version (overwrites your edits)",
      callback: () => this.resetSkill(pluginDir),
    });
    // Search, filter: the active canvas only. Filter and folds hide cards
    // (styles.css). The filter is view only (the file is untouched, it resets
    // when the board is reopened); folds are in the file.
    this.views = new WeakMap(); // canvas → emptyViewState() shape
    this.panes = new Map(); // canvas → FilterPane, one per open canvas
    this.finds = new Map(); // canvas → FindBar
    this.actions = [];
    for (const register of COMMAND_GROUPS) register(this);
    this.startStatusBar();
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => this.tick()),
    );
    this.registerInterval(window.setInterval(() => this.tick(), 2000));
    this.tick();
    this.register(() => this.clearScreens());
  }

  // Command pattern: each action is { id, menu, test, run }, run from the
  // palette, a hotkey, a right-click item or a toolbar button.
  // Refactor and archive commands: one undo step each (Ctrl+Z), same code as
  // canvas.js for agents. Each is also a right-click item on the cards it
  // applies to: `menu` is [title, Lucide icon], or null for none.
  addCanvasCommand(id, name, { menu, test, run }) {
    this.actions.push({ id, menu, test, run });
    this.addCommand({
      id,
      name,
      checkCallback: (checking) => {
        const canvas = this.activeCanvas();
        if (!canvas || !test(canvas, [...canvas.selection])) return false;
        if (!checking) this.runAction(run, canvas, [...canvas.selection]);
        return true;
      },
    });
  }

  runAction(run, canvas, selection) {
    return Promise.resolve(run(canvas, selection)).catch(
      (error) => new Notice(`Kanvas board: ${error.message}`),
    );
  }

  addActionItems(menu, canvas, selection) {
    const shown = this.actions.filter(
      (action) => action.menu && action.test(canvas, selection),
    );
    for (const action of shown) {
      menu.addItem((item) =>
        item
          .setTitle(this.keyedTitle(action.menu[0], action.id))
          .setIcon(action.menu[1])
          .setSection('canvas-board')
          .onClick(() => this.runAction(action.run, canvas, selection)),
      );
    }
  }

  // The selection grows to the visible cards that `keep` accepts (hidden
  // cards never stay selected); the selected cards stay selected.
  selectMore(canvas, selection, keep) {
    const added = [...canvas.nodes.values()].filter(
      (node) =>
        node.getData().type !== 'group' &&
        !this.isHidden(canvas, node) &&
        keep(node),
    );
    canvas.updateSelection(() => {
      canvas.selection.clear();
      for (const node of [...selection, ...added]) canvas.selection.add(node);
    });
    return added.length;
  }

  // Card count of the active canvas in the status bar: boards get hard to
  // manage past a threshold. Next to it, the active filter and folds; click
  // to change them.
  startStatusBar() {
    this.countEl = this.addStatusBarItem();
    this.viewEl = this.addStatusBarItem();
    this.viewEl.addClass('mod-clickable');
    this.viewEl.onClickEvent(() => {
      const canvas = this.activeCanvas();
      if (canvas) this.pane(canvas).toggle(true);
    });
  }

  // Cards that come into view or are added get the classes again. Every open
  // canvas has its filter pane; closed canvases lose theirs.
  tick() {
    this.updateCount();
    const open = new Set();
    for (const leaf of this.app.workspace.getLeavesOfType('canvas')) {
      const canvas = leaf.view.canvas;
      if (!canvas || !canvas.wrapperEl) continue;
      open.add(canvas);
      this.decorate(leaf.view);
      this.refreshView(canvas); // folds come with the file: every canvas
      this.pane(canvas).update();
    }
    for (const widgets of [this.panes, this.finds]) {
      const closed = [...widgets].filter(([canvas]) => !open.has(canvas));
      for (const [canvas, widget] of closed) {
        widget.destroy();
        widgets.delete(canvas);
      }
    }
  }

  // On unload: folds stay in the file, only the screen is cleared.
  clearScreens() {
    for (const widget of [...this.panes.values(), ...this.finds.values()]) {
      widget.destroy();
    }
    this.panes.clear();
    this.finds.clear();
    for (const leaf of this.app.workspace.getLeavesOfType('canvas')) {
      const canvas = leaf.view.canvas;
      this.undecorate(leaf.view);
      if (!this.views.has(canvas)) continue;
      delete canvas.updateSelection;
      delete canvas.applyHistory;
      this.paint(canvas, new Set(), new Map());
    }
  }

  // Control bar and selection toolbar are undocumented canvas DOM
  // (.canvas-controls, canvas.menu.render), like folds and the filter pane: an
  // Obsidian update may drop those buttons, the commands stay. Header action
  // and ribbon icon are documented API. See "Obsidian internals" in README.md.

  // Label of a color: the one edited in Settings > Workflow, else the default.
  colorLabel(name) {
    return (
      (this.settings.colorLabels || {})[name] ||
      COLORS.find((colorRow) => colorRow[0] === name)[3]
    );
  }

  colorCommandName(name) {
    return `Color selected cards: ${name} (${this.colorLabel(name)})`;
  }

  // An edited label also renames its command in the palette and the hotkey
  // list. The id, and so the key, stays.
  async setColorLabel(name, label) {
    const labels = (this.settings.colorLabels = {
      ...this.settings.colorLabels,
    });
    if (label) labels[name] = label;
    else delete labels[name];
    await this.saveData(this.settings);
    const row = COLORS.find((colorRow) => colorRow[0] === name);
    const colorCommand =
      this.app.commands &&
      this.app.commands.commands[`${this.manifest.id}:color-${row[2]}`];
    if (colorCommand) {
      colorCommand.name = `${this.manifest.name}: ${this.colorCommandName(name)}`;
    }
    for (const canvas of this.panes.keys()) this.refreshView(canvas);
  }

  // Hotkey of a plugin command as Obsidian prints it ("Alt + ↑"), or ''.
  hotkey(id) {
    const hotkeyManager = this.app.hotkeyManager;
    try {
      return (
        (hotkeyManager &&
          hotkeyManager.printHotkeyForCommand &&
          hotkeyManager.printHotkeyForCommand(`${this.manifest.id}:${id}`)) ||
        ''
      );
    } catch (error) {
      return '';
    }
  }

  // Tooltip with its key, the way the canvas's own buttons show it ("Zoom to
  // selection\n(Shift + 2)").
  keyedLabel(label, id) {
    const hotkey = this.hotkey(id);
    return hotkey ? `${label}\n(${hotkey})` : label;
  }

  // Menu item title with its key, muted, after the label.
  keyedTitle(label, id) {
    const hotkey = this.hotkey(id);
    if (!hotkey) return label;
    return createFragment((fragment) => {
      fragment.appendText(label);
      fragment.createSpan({ cls: 'canvas-board-key', text: hotkey });
    });
  }

  // A notice with an Undo button: one canvas undo step and the files the action
  // made go to the trash. Only while the board has not changed since (else the
  // undo would take back something else). `restore` ({ path, content }) brings
  // a trashed file back on undo (unpack). Redirected links are not undone.
  undoNotice(canvas, message, { files = [], restore = null } = {}) {
    const history = canvas.history;
    const historyIndex = history ? history.current : null;
    const noticeContent = createFragment((fragment) => {
      fragment.appendText(`Kanvas board: ${message} `);
      const button = fragment.createEl('button', {
        cls: 'canvas-board-notice-undo',
        text: 'Undo',
      });
      button.addEventListener('click', async () => {
        if (!history || history.current !== historyIndex) {
          new Notice('Kanvas board: the board changed since, use Ctrl+Z');
          return;
        }
        canvas.undo();
        for (const filePath of files) {
          const file = this.app.vault.getAbstractFileByPath(filePath);
          if (file) await this.app.fileManager.trashFile(file);
        }
        if (restore && !this.app.vault.getAbstractFileByPath(restore.path)) {
          await this.app.vault.create(restore.path, restore.content);
        }
      });
    });
    new Notice(noticeContent, 8000);
  }

  async openBoard() {
    const board = this.settings.defaultBoard;
    const leaf = this.app.workspace
      .getLeavesOfType('canvas')
      .find((leaf) => leaf.view.file && leaf.view.file.path === board);
    if (leaf) {
      this.app.workspace.setActiveLeaf(leaf, { focus: true });
      return;
    }
    const file = this.app.vault.getAbstractFileByPath(board);
    if (!file) {
      new Notice(
        createFragment((fragment) => {
          fragment.appendText(
            `Kanvas board: ${board} not found (setting "Default board"). `,
          );
          const button = fragment.createEl('button', {
            cls: 'canvas-board-notice-undo',
            text: 'Create a starter board',
          });
          button.addEventListener('click', () => this.createStarterBoard());
        }),
        10000,
      );
      return;
    }
    await this.app.workspace.getLeaf(false).openFile(file);
  }

  createStarterBoard() {
    return createStarterBoard(this);
  }

  async setLayoutDirection(direction) {
    this.settings.layoutDirection = direction;
    await this.saveData(this.settings);
    for (const leaf of this.app.workspace.getLeavesOfType('canvas')) {
      this.decorate(leaf.view);
    }
    new Notice(`Kanvas board: tidy layout ${LAYOUT_DIRS[direction].name}`);
  }

  cycleLayoutDirection() {
    const dirs = Object.keys(LAYOUT_DIRS);
    return this.setLayoutDirection(
      dirs[(dirs.indexOf(this.settings.layoutDirection) + 1) % dirs.length],
    );
  }

  // Runs a plugin command on this canvas view (made active first: a click on
  // its buttons may not focus it).
  runOn(view, id) {
    const leaf = this.app.workspace
      .getLeavesOfType('canvas')
      .find((leaf) => leaf.view === view);
    if (leaf && this.app.workspace.activeLeaf !== leaf) {
      this.app.workspace.setActiveLeaf(leaf, { focus: true });
    }
    this.app.commands.executeCommandById(`${this.manifest.id}:${id}`);
  }

  // Buttons on a canvas view, added once (tick runs every 2 s and adds back
  // what the canvas redrew away).
  decorate(view) {
    this.decorateHeader(view);
    const controls =
      view.canvas.wrapperEl &&
      view.canvas.wrapperEl.querySelector('.canvas-controls');
    if (controls) this.decorateControls(view, controls);
    this.decorateSelectionToolbar(view.canvas);
  }

  // View header: Run pass, a command about the whole board.
  decorateHeader(view) {
    if (!view.canvasBoardAction && view.addAction) {
      view.canvasBoardAction = view.addAction('play', 'Run pass', () =>
        this.runPass(),
      );
    }
    if (!view.canvasBoardAction) return;
    view.canvasBoardAction.setAttr(
      'aria-label',
      this.keyedLabel('Run pass', 'run-pass'),
    );
  }

  // Control bar (top right): Search, Filter, Tidy layout, above Canvas help.
  decorateControls(view, controls) {
    const group =
      controls.querySelector('.canvas-board-controls') ||
      this.addControlGroup(view, controls);
    for (const button of group.children) {
      button.setAttr(
        'aria-label',
        this.keyedLabel(button.dataset.label, button.dataset.command),
      );
    }
    const tidy = group.querySelector('[data-command="tidy-layout"]');
    if (tidy) this.decorateTidyButton(tidy);
  }

  addControlGroup(view, controls) {
    const group = createDiv({
      cls: 'canvas-control-group mod-raised canvas-board-controls',
    });
    controls.insertBefore(group, controls.lastElementChild);
    for (const [id, label, icon] of CONTROL_BUTTONS) {
      const button = group.createDiv({
        cls: 'canvas-control-item',
        attr: {
          'data-command': id,
          'data-label': label,
          'data-tooltip-position': 'left',
        },
      });
      setIcon(button, icon);
      button.addEventListener('click', (event) => {
        const isNextDirection = id === 'tidy-layout' && event.shiftKey;
        if (isNextDirection) this.cycleLayoutDirection();
        else this.runOn(view, id);
      });
    }
    return group;
  }

  // The tidy icon points the way the layout flows; its tooltip says so and
  // how to change it.
  decorateTidyButton(tidy) {
    const direction =
      LAYOUT_DIRS[this.settings.layoutDirection] || LAYOUT_DIRS.TB;
    this.tidyTurn = nextTurn(this.tidyTurn ?? direction.turn, direction.turn);
    tidy.style.setProperty('--canvas-board-tidy-turn', `${this.tidyTurn}deg`);
    tidy.setAttr(
      'aria-label',
      this.keyedLabel(
        `Tidy layout: ${direction.name}\nShift-click: next direction`,
        'tidy-layout',
      ),
    );
  }

  // Decorator: the canvas's menu.render is wrapped, not replaced.
  // Selection toolbar: Fold, Unfold, Archive after the canvas's own buttons,
  // when they apply.
  decorateSelectionToolbar(canvas) {
    const menu = canvas.menu;
    if (!menu || !menu.render || menu.canvasBoardRender) return;
    const original = (menu.canvasBoardRender = menu.render);
    const plugin = this;
    menu.render = function (...values) {
      const result = original.apply(this, values);
      try {
        plugin.menuButtons(canvas);
      } catch (error) {
        console.error('canvas-board: selection toolbar', error);
      }
      return result;
    };
    // The color picker opens on click: its swatches get the state as tooltip.
    menu.canvasBoardObserver = new MutationObserver(() =>
      this.labelColorSwatches(menu.menuEl),
    );
    menu.canvasBoardObserver.observe(menu.menuEl, {
      childList: true,
      subtree: true,
    });
  }

  labelColorSwatches(menuEl) {
    const swatches = menuEl.querySelectorAll(
      '.canvas-color-picker-item:not(.canvas-color-picker-custom)',
    );
    for (const item of swatches) {
      const color =
        (item.className.match(/mod-canvas-color-(\d)/) || [])[1] || '';
      const row = COLORS.find((x) => x[1] === color);
      if (!row) continue;
      item.setAttrs({
        'aria-label': this.keyedLabel(
          this.colorLabel(row[0]),
          `color-${row[2]}`,
        ),
        'data-tooltip-position': 'top',
      });
    }
  }

  menuButtons(canvas) {
    const element = canvas.menu.menuEl;
    const selection = [...canvas.selection];
    if (
      !selection.length ||
      !element.childElementCount ||
      element.querySelector('.canvas-board-menu-btn')
    ) {
      return;
    }
    for (const id of ['fold', 'unfold', 'archive']) {
      const action = this.actions.find((x) => x.id === id);
      if (!action || !action.test(canvas, selection)) continue;
      const button = element.createEl('button', {
        cls: 'clickable-icon canvas-board-menu-btn',
        attr: {
          'aria-label': this.keyedLabel(action.menu[0], id),
          'data-tooltip-position': 'top',
        },
      });
      setIcon(button, action.menu[1]);
      button.addEventListener('click', () =>
        this.runAction(action.run, canvas, [...canvas.selection]),
      );
    }
  }

  undecorate(view) {
    const canvas = view.canvas;
    if (view.canvasBoardAction) {
      view.canvasBoardAction.remove();
      delete view.canvasBoardAction;
    }
    if (canvas.wrapperEl) {
      for (const element of canvas.wrapperEl.querySelectorAll(
        '.canvas-board-controls, .canvas-board-menu-btn',
      )) {
        element.remove();
      }
    }
    const menu = canvas.menu;
    if (menu && menu.canvasBoardRender) {
      menu.render = menu.canvasBoardRender;
      delete menu.canvasBoardRender;
      menu.canvasBoardObserver.disconnect();
      delete menu.canvasBoardObserver;
    }
  }

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
        for (const x of [...this.selection]) {
          if (
            state.hidden.has(x.id) ||
            (x.from &&
              (state.hidden.has(x.from.node.id) ||
                state.hidden.has(x.to.node.id)))
          ) {
            this.selection.delete(x);
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
    const isNew = (each) => !seen.has(each) && Boolean(seen.add(each));
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
    if ([...canvas.selection].some((x) => hidden.has(x.id))) {
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
    const isCard = (id) =>
      canvas.nodes.get(id) && canvas.nodes.get(id).getData().type !== 'group';
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
      node.nodeEl.toggleClass('canvas-board-hidden', hidden.has(node.id));
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
        element.classList.toggle('canvas-board-hidden', isOff);
      }
    }
  }

  // count: cards folded under the node, undefined when it is not folded.
  paintFoldBadge(canvas, node, count) {
    let badge = node.nodeEl.querySelector(':scope > .canvas-board-folded');
    if (count === undefined) {
      if (badge) badge.remove();
      return;
    }
    if (!badge) {
      badge = node.nodeEl.createDiv({
        cls: 'canvas-board-folded',
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
    let badge = node.nodeEl.querySelector(':scope > .canvas-board-stale');
    if (age < days || age < 0) {
      if (badge) badge.remove();
      return;
    }
    if (!badge) {
      badge = node.nodeEl.createDiv({
        cls: 'canvas-board-stale',
        attr: { 'data-tooltip-position': 'top' },
      });
      setIcon(
        badge.createSpan({ cls: 'canvas-board-stale-icon' }),
        'triangle-alert',
      );
      badge.createSpan({ cls: 'canvas-board-stale-text' });
    }
    const label = age < 1 ? 'today' : `${age}d`;
    if (badge.dataset.age === label) return;
    badge.dataset.age = label;
    badge.querySelector('.canvas-board-stale-text').setText(label);
    const unit = `day${age === 1 ? '' : 's'}`;
    badge.setAttr(
      'aria-label',
      `Waiting on you · note untouched for ${age} ${unit} (stale after ${days})`,
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
      : `background: ${color.startsWith('#') ? color : `var(--canvas-color-${color})`}`;
  }

  // Template cards are centered on the visible canvas, whatever is selected;
  // they end up selected.
  async insertTemplate(canvas, file) {
    const template = JSON.parse(await this.app.vault.read(file));
    const nodes = template.nodes || [];
    const viewport = canvas.getViewportBBox();
    const width = nodes.length
      ? Math.max(...nodes.map((node) => node.x + node.width)) -
        Math.min(...nodes.map((node) => node.x))
      : 0;
    const height = nodes.length
      ? Math.max(...nodes.map((node) => node.y + node.height)) -
        Math.min(...nodes.map((node) => node.y))
      : 0;
    const origin = {
      x: Math.round((viewport.minX + viewport.maxX - width) / 2),
      y: Math.round((viewport.minY + viewport.maxY - height) / 2),
    };
    const operations = this.boardLibrary.templateOps(template, origin);
    this.edit(canvas, operations);
    const added = operations
      .filter((operation) => operation.op === 'add')
      .map((operation) => canvas.nodes.get(operation.node.id))
      .filter(Boolean);
    canvas.updateSelection(() => {
      canvas.selection.clear();
      for (const node of added) canvas.selection.add(node);
    });
  }

  updateCount() {
    const canvas = this.activeCanvas();
    this.updateViewLabel(canvas);
    if (!canvas) {
      this.countEl.setText('');
      this.countEl.hide();
      return;
    }
    const cards = [...canvas.nodes.values()]
      .map((node) => node.getData())
      .filter((node) => node.type !== 'group');
    const names = {
      '': 'none',
      1: 'red',
      2: 'orange',
      3: 'yellow',
      4: 'green',
      5: 'cyan',
      6: 'purple',
    };
    const byColor = {};
    for (const node of cards) {
      const colorName = names[node.color || ''] || 'custom';
      byColor[colorName] = (byColor[colorName] || 0) + 1;
    }
    const max = Number(this.settings.cardWarning) || 0;
    const isOverLimit = max > 0 && cards.length > max;
    // cards and groups, not edges
    const selectedCount = [...canvas.selection].filter((x) => !x.from).length;
    // Only the card count takes the warning color, not the selected count.
    this.countEl.empty();
    this.countEl.createSpan({
      text: `${cards.length} cards`,
      cls: isOverLimit ? 'canvas-board-over' : '',
    }); // warning color, see styles.css
    if (selectedCount) this.countEl.appendText(` · ${selectedCount} selected`);
    this.countEl.setAttr(
      'aria-label',
      (isOverLimit ? `over ${max} · ` : '') +
        Object.entries(byColor)
          .map(([colorName, count]) => `${colorName} ${count}`)
          .join(' · '),
    );
    this.countEl.setAttr('data-tooltip-position', 'top');
    this.countEl.show();
  }

  // The plugin folder holds the skill's default; the vault copy is written only
  // when missing (then it is the user's, plugin updates never overwrite it) or
  // on "Reset agent skill".
  skillPath() {
    return path.join(
      this.app.vault.adapter.basePath,
      '.claude',
      'skills',
      'canvas-board',
      'SKILL.md',
    );
  }

  installSkill(pluginDir) {
    try {
      if (fileSystem.existsSync(this.skillPath())) return;
      this.copySkill(pluginDir);
    } catch (error) {
      console.error('canvas-board: skill sync failed', error);
    }
  }

  resetSkill(pluginDir) {
    try {
      this.copySkill(pluginDir);
      new Notice("Kanvas board: agent skill reset to the plugin's version");
    } catch (error) {
      console.error('canvas-board: skill sync failed', error);
      new Notice(`Kanvas board: skill reset failed (${error.message})`);
    }
  }

  copySkill(pluginDir) {
    const skillTarget = this.skillPath();
    fileSystem.mkdirSync(path.dirname(skillTarget), { recursive: true });
    fileSystem.copyFileSync(
      path.join(pluginDir, 'skill', 'SKILL.md'),
      skillTarget,
    );
  }

  // One undo step: the state before is pushed (unless the history already ends
  // with it), then the edited data is set, which pushes it, so Ctrl+Z and
  // Ctrl+Y each take one step. `canvasData` is passed when the caller already
  // changed it (extract).
  edit(canvas, operations, canvasData = canvas.getData()) {
    const before = canvas.getData();
    const retyped = this.boardLibrary.applyOps(canvasData, operations);
    const history = canvas.history;
    const last = history && history.data && history.data[history.current];
    const same = (x) =>
      JSON.stringify(x, (key, value) =>
        value && typeof value === 'object' && !Array.isArray(value)
          ? Object.fromEntries(Object.entries(value).sort())
          : value,
      ); // key order aside
    if (canvas.pushHistory && (!last || same(last) !== same(before))) {
      canvas.pushHistory(before);
    }
    if (retyped.length) {
      canvas.setData({
        ...canvasData,
        nodes: canvasData.nodes.filter((node) => !retyped.includes(node.id)),
      });
    }
    canvas.setData(canvasData); // pushes the new state
    // without false it pushes it again a moment later: one more Ctrl+Z needed
    canvas.requestSave(false);
  }

  activeFile() {
    const view =
      this.app.workspace.activeLeaf && this.app.workspace.activeLeaf.view;
    return view && view.file;
  }

  freePath(folder, name, extension) {
    for (let attempt = 1; ; attempt++) {
      const candidate = `${folder}${name}${attempt > 1 ? ' ' + attempt : ''}${extension}`;
      if (!this.app.vault.getAbstractFileByPath(candidate)) return candidate;
    }
  }

  subcanvasLinks(file, canvas, skipId) {
    return subcanvasLinks(this, file, { canvas, skipId });
  }

  canvasFile(canvas) {
    const leaf = this.app.workspace
      .getLeavesOfType('canvas')
      .find((leaf) => leaf.view.canvas === canvas);
    return leaf && leaf.view.file ? leaf.view.file.path : null;
  }

  // mode: dissolve (file to trash, other links break), copy (file kept), group
  // (cards in a group named after the file, other links redirected: cards on
  // this board get an edge to the group, other cards and notes link this
  // board).
  unpack(canvas, node, { file, mode, links }) {
    return unpackSubcanvas(this, canvas, { node, file, mode, links });
  }

  linkedCanvas(node) {
    const nodeData = node.getData();
    const target =
      nodeData.type === 'file'
        ? nodeData.file
        : ((nodeData.text || '').match(/\[\[([^\]|#]+\.canvas)/) || [])[1];
    if (!target || !target.endsWith('.canvas')) return null;
    return (
      this.app.vault.getAbstractFileByPath(target) ||
      this.app.metadataCache.getFirstLinkpathDest(target.trim(), '')
    );
  }

  cardEditor(node) {
    const child = node.child;
    return (
      (child && ((child.editMode && child.editMode.editor) || child.editor)) ||
      null
    );
  }

  // Context of the note a card links (its `context:` list), so its archive note
  // keeps the same context.
  cardContexts(node, board) {
    const nodeData = node.getData();
    const target =
      nodeData.type === 'file'
        ? nodeData.file
        : ((nodeData.text || '').match(/\[\[([^\]|#]+)/) || [])[1];
    const file =
      target &&
      this.app.metadataCache.getFirstLinkpathDest(target.trim(), board);
    const frontmatter =
      file && (this.app.metadataCache.getFileCache(file) || {}).frontmatter;
    const contexts =
      frontmatter && frontmatter.context
        ? [].concat(frontmatter.context).map(String)
        : [];
    return contexts.length ? contexts : undefined;
  }

  async restore(note) {
    const source = await this.app.vault.read(note);
    const { board } = this.boardLibrary.restoreOps(
      { nodes: [], edges: [] },
      source,
    );
    const file =
      this.app.vault.getAbstractFileByPath(board) ||
      this.app.metadataCache.getFirstLinkpathDest(board, note.path);
    if (!file) throw new Error(`board ${board} not found`);
    const canvas = this.openCanvas(file.path);
    if (canvas) {
      this.edit(
        canvas,
        this.boardLibrary.restoreOps(canvas.getData(), source).operations,
      );
    } else {
      await this.app.vault.process(file, (text) => {
        const canvasData = JSON.parse(text);
        canvasData.nodes = canvasData.nodes || [];
        canvasData.edges = canvasData.edges || [];
        this.boardLibrary.applyOps(
          canvasData,
          this.boardLibrary.restoreOps(canvasData, source).operations,
        );
        return JSON.stringify(canvasData, null, '\t');
      });
    }
    await this.app.fileManager.trashFile(note);
    new Notice(`Kanvas board: card restored on ${file.path}`);
  }

  openCanvas(board) {
    const leaf = this.app.workspace
      .getLeavesOfType('canvas')
      .find((leaf) => leaf.view.file && leaf.view.file.path === board);
    return leaf ? leaf.view.canvas : null;
  }

  activeCanvas() {
    const view =
      this.app.workspace.activeLeaf && this.app.workspace.activeLeaf.view;
    return view && view.getViewType() === 'canvas' ? view.canvas : null;
  }

  // True if the board, or a plan canvas linked from one of its cards, has a
  // card in `goColorSet` (setting "Workflow").
  async hasGoCards(board, goColorSet) {
    const read = async (filePath) => {
      const file = this.app.vault.getAbstractFileByPath(filePath);
      const canvasData =
        file && parseOrNull(await this.app.vault.cachedRead(file));
      return (canvasData && canvasData.nodes) || [];
    };
    const isGo = (node) => goColorSet.has(node.color);
    const open = this.openCanvas(board);
    const nodes = open ? open.getData().nodes : await read(board);
    if (nodes.some(isGo)) return true;
    const linkedCanvases = nodes.flatMap((node) => [
      ...(node.text || '').matchAll(/\[\[([^\]|#]+\.canvas)/g),
    ]);
    for (const match of linkedCanvases) {
      const linkedFile = this.app.metadataCache.getFirstLinkpathDest(
        match[1].trim(),
        board,
      );
      if (linkedFile && (await read(linkedFile.path)).some(isGo)) return true;
    }
    return false;
  }

  async runPass() {
    const vault = this.app.vault.adapter.basePath;
    const claude = claudeBin(this.settings.claudePath);
    const view =
      this.app.workspace.activeLeaf && this.app.workspace.activeLeaf.view;
    const board =
      view && view.getViewType() === 'canvas' && view.file
        ? view.file.path
        : this.settings.defaultBoard;
    const goColorSet = parseColors(this.settings.passColors);
    if (!goColorSet.size) return this.noticeNoGoColor();
    if (!(await this.hasGoCards(board, goColorSet))) {
      const names = Object.keys(COLOR_NUM).filter((colorName) =>
        goColorSet.has(COLOR_NUM[colorName]),
      );
      new Notice(
        `Kanvas board: nothing to do on ${board} (no ${names.join(' or ')} card)`,
      );
      return;
    }
    const template = String(this.settings.terminal || '').trim();
    const launch = terminalLaunch(template, { vault, board, claude });
    if (!launch) {
      new Notice(
        'Kanvas board: no terminal found to start the pass. Set "Terminal command" in the plugin settings.',
        10000,
      );
      return;
    }
    startPass(launch, { vault, board });
  }

  noticeNoGoColor() {
    new Notice(
      createFragment((fragment) => {
        fragment.appendText(
          'Kanvas board: the agent did not start, no color triggers it. Turn one on in Settings > Workflow. ',
        );
        const button = fragment.createEl('button', {
          cls: 'canvas-board-notice-undo',
          text: 'Open settings',
        });
        button.addEventListener('click', () => {
          this.app.setting.open();
          this.app.setting.openTabById(this.manifest.id);
        });
      }),
      10000,
    );
  }
}

module.exports = CanvasBoardPlugin;
