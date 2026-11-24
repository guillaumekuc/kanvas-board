import * as shared from './shared.js';
import * as obsidian from 'obsidian';
import * as commands from './commands.js';
import * as starterBoard from './starterBoard.js';
import * as pass from './pass.js';
import * as store from '../board/store.js';
import * as config from '../workflow/config.js';
import * as unpack from './unpack.js';
import CanvasBoardSettings from './CanvasBoardSettings.js';
import fileSystem from 'fs';
import path from 'path';
import * as boardView from './boardView.js';

const CANVAS_COLOR_CLASS = /mod-canvas-color-(\d)/;
const CANVAS_WIKILINKS = /\[\[([^\]|#]+\.canvas)/g;
const CANVAS_WIKILINK = /\[\[([^\]|#]+\.canvas)/;

const CONTROL_BUTTONS = [
  { id: 'find', label: 'Search current canvas', icon: 'search' },
  { id: 'filter', label: 'Filter cards', icon: 'filter' },
  { id: 'tidy-layout', label: 'Tidy layout', icon: 'network' },
];

class CanvasBoardPlugin extends obsidian.Plugin {
  async onload() {
    this.settings = Object.assign({}, shared.DEFAULTS, await this.loadData());
    this.migrateClaudePath();
    this.applyTheme(document);
    this.registerEvent(
      this.app.workspace.on('window-open', (ownerWindow) =>
        this.applyTheme(ownerWindow.doc || ownerWindow.win.document),
      ),
    );
    this.register(() => {
      for (const styleEl of this.themeEls.values()) {
        styleEl?.remove();
      }
    });
    this.addSettingTab(new CanvasBoardSettings(this.app, this));
    const pluginDir = path.join(
      this.app.vault.adapter.basePath,
      this.manifest.dir,
    );
    this.boardLibrary = shared.boardLibrary;
    this.apm = shared.startApmCounter(this, pluginDir);
    this.api = shared.createApi(this);
    this.installSkill(pluginDir);
    this.installTemplates();
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
    for (const register of commands.groups) {
      register(this);
    }
    this.startStatusBar();
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => this.tick()),
    );
    this.registerInterval(window.setInterval(() => this.tick(), 2000));
    this.tick();
    this.register(() => this.clearScreens());
  }

  // The colors the roles' slots show (Settings > Workflow), vault-wide: a
  // style overriding Obsidian's --canvas-color-N (config.themeCss), redone on
  // each change. Cards keep their slot numbers. One style per window: the
  // main one, popout windows and Settings when it opens in its own window.
  applyTheme(ownerDoc) {
    if (!this.themeEls) {
      this.themeEls = new Map(); // document → style element
    }
    if (ownerDoc && !this.themeEls.has(ownerDoc)) {
      this.themeEls.set(ownerDoc, null);
    }
    const css = config.themeCss(config.resolve(this.settings).colors);
    for (const [themed, styleEl] of this.themeEls) {
      if (!themed.defaultView) {
        this.themeEls.delete(themed); // its window closed
        continue;
      }
      const style =
        styleEl && styleEl.isConnected
          ? styleEl
          : themed.head.createEl('style', {
              attr: { id: 'kanvas-board-theme' },
            });
      style.textContent = css;
      this.themeEls.set(themed, style);
    }
  }

  // Command pattern: each action is { id, menu, test, run }, run from the
  // palette, a hotkey, a right-click item or a toolbar button.
  // Refactor and archive commands: one undo step each (Ctrl+Z), same code as
  // canvas.js for agents. Each is also a right-click item on the cards it
  // applies to: `menu` is { title, icon } (Lucide), or null for none.
  addCanvasCommand(id, name, { menu, test, run }) {
    this.actions.push({ id, menu, test, run });
    this.addCommand({
      id,
      name,
      checkCallback: (checking) => {
        const canvas = this.activeCanvas();
        if (!canvas || !test(canvas, [...canvas.selection])) {
          return false;
        }
        if (!checking) {
          this.runAction(run, canvas, [...canvas.selection]);
        }

        return true;
      },
    });
  }

  runAction(run, canvas, selection) {
    return Promise.resolve(run(canvas, selection)).catch(
      (error) => new obsidian.Notice(`Kanvas board: ${error.message}`),
    );
  }

  addActionItems(menu, canvas, selection) {
    const shown = this.actions.filter(
      (action) => action.menu && action.test(canvas, selection),
    );
    for (const action of shown) {
      menu.addItem((item) =>
        item
          .setTitle(this.keyedTitle(action.menu.title, action.id))
          .setIcon(action.menu.icon)
          .setSection('kanvas-board')
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
      for (const node of [...selection, ...added]) {
        canvas.selection.add(node);
      }
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
      if (canvas) {
        this.pane(canvas).toggle(true);
      }
    });
  }

  // Cards that come into view or are added get the classes again. Every open
  // canvas has its filter pane; closed canvases lose theirs.
  tick() {
    this.updateCount();
    const open = new Set();
    for (const leaf of this.app.workspace.getLeavesOfType('canvas')) {
      const canvas = leaf.view.canvas;
      if (!canvas || !canvas.wrapperEl) {
        continue;
      }
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
      if (!this.views.has(canvas)) {
        continue;
      }
      delete canvas.updateSelection;
      delete canvas.applyHistory;
      this.paint(canvas, new Set(), new Map());
    }
  }

  // Control bar and selection toolbar are undocumented canvas DOM
  // (.canvas-controls, canvas.menu.render), like folds and the filter pane: an
  // Obsidian update may drop those buttons, the commands stay. Header action
  // and ribbon icon are documented API. See "Obsidian internals" in README.md.

  // Label of a color: the one edited in Settings > Workflow, else its role's.
  colorLabel(name) {
    return (
      (this.settings.colorLabels || {})[name] ||
      config.defaultLabel(name, config.resolve(this.settings))
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
    if (label) {
      labels[name] = label;
    } else {
      delete labels[name];
    }
    await this.saveData(this.settings);
    const row = shared.COLORS.find((colorRow) => colorRow.name === name);
    const colorCommand =
      this.app.commands &&
      this.app.commands.commands[`${this.manifest.id}:color-${row.commandKey}`];
    const commandName = this.colorCommandName(name);
    if (colorCommand) {
      colorCommand.name = `${this.manifest.name}: ${commandName}`;
    }
    for (const canvas of this.panes.keys()) {
      this.refreshView(canvas);
    }
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
    if (!hotkey) {
      return label;
    }

    return createFragment((fragment) => {
      fragment.appendText(label);
      fragment.createSpan({ cls: 'kanvas-board-key', text: hotkey });
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
        cls: 'kanvas-board-notice-undo',
        text: 'Undo',
      });
      button.addEventListener('click', async () => {
        if (!history || history.current !== historyIndex) {
          new obsidian.Notice(
            'Kanvas board: the board changed since, use Ctrl+Z',
          );
          return;
        }

        canvas.undo();
        for (const filePath of files) {
          const file = this.app.vault.getAbstractFileByPath(filePath);
          if (file) {
            await this.app.fileManager.trashFile(file);
          }
        }
        if (restore && !this.app.vault.getAbstractFileByPath(restore.path)) {
          await this.app.vault.create(restore.path, restore.content);
        }
      });
    });
    new obsidian.Notice(noticeContent, 8000);
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
      new obsidian.Notice(
        createFragment((fragment) => {
          fragment.appendText(
            `Kanvas board: ${board} not found (setting "Default board"). `,
          );
          const button = fragment.createEl('button', {
            cls: 'kanvas-board-notice-undo',
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
    return starterBoard.createStarterBoard(this);
  }

  async setLayoutDirection(direction) {
    this.settings.layoutDirection = direction;
    await this.saveData(this.settings);
    for (const leaf of this.app.workspace.getLeavesOfType('canvas')) {
      this.decorate(leaf.view);
    }
    new obsidian.Notice(
      `Kanvas board: tidy layout ${shared.LAYOUT_DIRS[direction].name}`,
    );
  }

  cycleLayoutDirection() {
    const dirs = Object.keys(shared.LAYOUT_DIRS);

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
    if (controls) {
      this.decorateControls(view, controls);
    }
    this.decorateSelectionToolbar(view.canvas);
  }

  // View header: Run pass, a command about the whole board.
  decorateHeader(view) {
    if (!view.canvasBoardAction && view.addAction) {
      view.canvasBoardAction = view.addAction('play', 'Run pass', () =>
        this.runPass(),
      );
    }
    if (!view.canvasBoardAction) {
      return;
    }
    view.canvasBoardAction.setAttr(
      'aria-label',
      this.keyedLabel('Run pass', 'run-pass'),
    );
  }

  // Control bar (top right): Search, Filter, Tidy layout, above Canvas help.
  decorateControls(view, controls) {
    const group =
      controls.querySelector('.kanvas-board-controls') ||
      this.addControlGroup(view, controls);
    for (const button of group.children) {
      button.setAttr(
        'aria-label',
        this.keyedLabel(button.dataset.label, button.dataset.command),
      );
    }
    const tidy = group.querySelector('[data-command="tidy-layout"]');
    if (tidy) {
      this.decorateTidyButton(tidy);
    }
  }

  addControlGroup(view, controls) {
    const group = createDiv({
      cls: 'canvas-control-group mod-raised kanvas-board-controls',
    });
    controls.insertBefore(group, controls.lastElementChild);
    for (const { id, label, icon } of CONTROL_BUTTONS) {
      const button = group.createDiv({
        cls: 'canvas-control-item',
        attr: {
          'data-command': id,
          'data-label': label,
          'data-tooltip-position': 'left',
        },
      });
      obsidian.setIcon(button, icon);
      button.addEventListener('click', (event) => {
        const isNextDirection = id === 'tidy-layout' && event.shiftKey;
        if (isNextDirection) {
          this.cycleLayoutDirection();
        } else {
          this.runOn(view, id);
        }
      });
    }

    return group;
  }

  // The tidy icon points the way the layout flows; its tooltip says so and
  // how to change it.
  decorateTidyButton(tidy) {
    const direction =
      shared.LAYOUT_DIRS[this.settings.layoutDirection] ||
      shared.LAYOUT_DIRS.TB;
    this.tidyTurn = pass.nextTurn(
      this.tidyTurn ?? direction.turn,
      direction.turn,
    );
    tidy.style.setProperty('--kanvas-board-tidy-turn', `${this.tidyTurn}deg`);
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
    if (!menu || !menu.render || menu.canvasBoardRender) {
      return;
    }
    const original = (menu.canvasBoardRender = menu.render);
    const plugin = this;
    menu.render = function (...values) {
      const result = original.apply(this, values);
      try {
        plugin.menuButtons(canvas);
      } catch (error) {
        console.error('kanvas-board: selection toolbar', error);
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
      const color = (item.className.match(CANVAS_COLOR_CLASS) || [])[1] || '';
      const row = shared.COLORS.find(
        (colorRow) => colorRow.canvasColor === color,
      );
      if (!row) {
        continue;
      }
      item.setAttrs({
        'aria-label': this.keyedLabel(
          this.colorLabel(row.name),
          `color-${row.commandKey}`,
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
      element.querySelector('.kanvas-board-menu-btn')
    ) {
      return;
    }
    for (const id of ['fold', 'unfold', 'archive']) {
      const action = this.actions.find((candidate) => candidate.id === id);
      if (!action || !action.test(canvas, selection)) {
        continue;
      }
      const button = element.createEl('button', {
        cls: 'clickable-icon kanvas-board-menu-btn',
        attr: {
          'aria-label': this.keyedLabel(action.menu.title, id),
          'data-tooltip-position': 'top',
        },
      });
      obsidian.setIcon(button, action.menu.icon);
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
        '.kanvas-board-controls, .kanvas-board-menu-btn',
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
      for (const node of added) {
        canvas.selection.add(node);
      }
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
    const selectedCount = [...canvas.selection].filter(
      (item) => !item.from,
    ).length;
    // Only the card count takes the warning color, not the selected count.
    this.countEl.empty();
    this.countEl.createSpan({
      text: `${cards.length} cards`,
      cls: isOverLimit ? 'kanvas-board-over' : '',
    }); // warning color, see styles.css
    if (selectedCount) {
      this.countEl.appendText(` · ${selectedCount} selected`);
    }
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

  // Before "Agent command", the setting only held the Claude Code binary.
  migrateClaudePath() {
    if (!('claudePath' in this.settings)) {
      return;
    }

    if (this.settings.claudePath && !this.settings.agentCommand) {
      this.settings.agentCommand = `"${this.settings.claudePath}"`;
    }
    delete this.settings.claudePath;
  }

  // The plugin folder holds the skill's default (skill/SKILL.md); the user's
  // copy is a vault note (Settings > Workflow, default <notes
  // folder>/_templates/Agent instructions.md), written only when missing or on
  // "Reset agent skill".
  skillRelativePath() {
    return config.resolve(this.settings).instructions;
  }

  skillPath() {
    return path.join(this.app.vault.adapter.basePath, this.skillRelativePath());
  }

  // Older versions kept the user's copy in the plugin folder
  // (agent-instructions.md), before that in .claude/skills/<id>/SKILL.md.
  legacySkillPath() {
    const vaultRoot = this.app.vault.adapter.basePath;
    const skills = path.join(vaultRoot, '.claude', 'skills');
    const candidates = [
      path.join(vaultRoot, this.manifest.dir, 'agent-instructions.md'),
      ...['kanvas-board', 'canvas-board'].map((name) =>
        path.join(skills, name, 'SKILL.md'),
      ),
    ];

    return candidates.find((candidate) => fileSystem.existsSync(candidate));
  }

  installSkill(pluginDir) {
    try {
      if (fileSystem.existsSync(this.skillPath())) {
        return;
      }
      const legacy = this.legacySkillPath();
      if (legacy) {
        fileSystem.mkdirSync(path.dirname(this.skillPath()), {
          recursive: true,
        });

        return fileSystem.copyFileSync(legacy, this.skillPath());
      }
      this.copySkill(pluginDir);
    } catch (error) {
      console.error('kanvas-board: skill sync failed', error);
    }
  }

  resetSkill(pluginDir) {
    try {
      this.copySkill(pluginDir);
      new obsidian.Notice(
        "Kanvas board: agent skill reset to the plugin's version",
      );
    } catch (error) {
      console.error('kanvas-board: skill sync failed', error);
      new obsidian.Notice(
        `Kanvas board: skill reset failed (${error.message})`,
      );
    }
  }

  // The card and plan-note templates (Settings > Workflow) are vault notes:
  // written from the plugin's defaults when missing, then the user's.
  installTemplates() {
    const workflow = config.resolve(this.settings);
    const templates = [
      [workflow.cardTemplate, config.CARD_TEMPLATE],
      [workflow.noteTemplate, config.NOTE_TEMPLATE],
    ];
    const missing = templates
      .map(([relativePath, text]) => [
        path.join(this.app.vault.adapter.basePath, relativePath),
        text,
      ])
      .filter(([file]) => !fileSystem.existsSync(file));
    for (const [file, text] of missing) {
      try {
        fileSystem.mkdirSync(path.dirname(file), { recursive: true });
        fileSystem.writeFileSync(file, text);
      } catch (error) {
        console.error('kanvas-board: template install failed', error);
      }
    }
  }

  // What a pass reads: the agent instructions with their {placeholders}
  // filled in from the workflow settings, written next to them when the pass
  // starts (pass-instructions.md, git-ignored). Without instructions the pass
  // points at the missing file, as before.
  writePassInstructions() {
    const relativePath = `${this.manifest.dir}/pass-instructions.md`;
    try {
      const text = fileSystem.readFileSync(this.skillPath(), 'utf8');
      const filled = config.fillPlaceholders(
        text,
        config.resolve(this.settings),
      );
      fileSystem.writeFileSync(
        path.join(this.app.vault.adapter.basePath, relativePath),
        filled,
      );

      return relativePath;
    } catch (error) {
      console.error('kanvas-board: pass instructions not written', error);

      return this.skillRelativePath();
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
    function same(data) {
      return JSON.stringify(data, (key, value) =>
        value && typeof value === 'object' && !Array.isArray(value)
          ? Object.fromEntries(Object.entries(value).sort())
          : value,
      );
    } // key order aside
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
      const suffix = attempt > 1 ? ` ${attempt}` : '';
      const candidate = `${folder}${name}${suffix}${extension}`;
      if (!this.app.vault.getAbstractFileByPath(candidate)) {
        return candidate;
      }
    }
  }

  subcanvasLinks(file, canvas, skipId) {
    return unpack.subcanvasLinks(this, file, { canvas, skipId });
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
    return unpack.unpackSubcanvas(this, canvas, { node, file, mode, links });
  }

  linkedCanvas(node) {
    const nodeData = node.getData();
    const target =
      nodeData.type === 'file'
        ? nodeData.file
        : ((nodeData.text || '').match(CANVAS_WIKILINK) || [])[1];
    if (!target || !target.endsWith('.canvas')) {
      return null;
    }

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

  async restore(note) {
    const source = await this.app.vault.read(note);
    const { board } = this.boardLibrary.restoreOps(
      { nodes: [], edges: [] },
      source,
    );
    const file =
      this.app.vault.getAbstractFileByPath(board) ||
      this.app.metadataCache.getFirstLinkpathDest(board, note.path);
    if (!file) {
      throw new Error(`board ${board} not found`);
    }
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
    new obsidian.Notice(`Kanvas board: card restored on ${file.path}`);
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
        file && store.parseOrNull(await this.app.vault.cachedRead(file));

      return (canvasData && canvasData.nodes) || [];
    };
    function isGo(node) {
      return goColorSet.has(node.color);
    }
    const open = this.openCanvas(board);
    const nodes = open ? open.getData().nodes : await read(board);
    if (nodes.some(isGo)) {
      return true;
    }
    const linkedCanvases = nodes.flatMap((node) => [
      ...(node.text || '').matchAll(CANVAS_WIKILINKS),
    ]);
    for (const match of linkedCanvases) {
      const linkedFile = this.app.metadataCache.getFirstLinkpathDest(
        match[1].trim(),
        board,
      );
      if (linkedFile && (await read(linkedFile.path)).some(isGo)) {
        return true;
      }
    }

    return false;
  }

  async runPass() {
    const vault = this.app.vault.adapter.basePath;
    const view =
      this.app.workspace.activeLeaf && this.app.workspace.activeLeaf.view;
    const board =
      view && view.getViewType() === 'canvas' && view.file
        ? view.file.path
        : this.settings.defaultBoard;
    const goColorSet = pass.parseColors(this.settings.passColors);
    if (!goColorSet.size) {
      return this.noticeNoGoColor();
    }
    if (!(await this.hasGoCards(board, goColorSet))) {
      const names = Object.keys(shared.COLOR_NUM).filter((colorName) =>
        goColorSet.has(shared.COLOR_NUM[colorName]),
      );
      new obsidian.Notice(
        `Kanvas board: nothing to do on ${board} (no ` +
          `${names.join(' or ')} card)`,
      );
      return;
    }
    const template = String(this.settings.terminal || '').trim();
    const prompt = pass.passPrompt(this.writePassInstructions(), board);
    const agent = pass.agentWords(this.settings.agentCommand, prompt);
    const launch = pass.terminalLaunch(template, { vault, board, agent });
    if (!launch) {
      new obsidian.Notice(
        'Kanvas board: no terminal found to start the pass. Set ' +
          '"Terminal command" in the plugin settings.',
        10000,
      );
      return;
    }
    pass.startPass(launch, { vault, board });
  }

  noticeNoGoColor() {
    new obsidian.Notice(
      createFragment((fragment) => {
        fragment.appendText(
          'Kanvas board: the agent did not start, no color triggers it. ' +
            'Turn one on in Settings > Workflow. ',
        );
        const button = fragment.createEl('button', {
          cls: 'kanvas-board-notice-undo',
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

boardView.mixBoardView(CanvasBoardPlugin);

export default CanvasBoardPlugin;
