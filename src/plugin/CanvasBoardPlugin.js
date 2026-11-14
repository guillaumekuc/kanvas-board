const {
  COLORS,
  COLOR_NUM,
  DEFAULTS,
  LAYOUT_DIRS,
  WORKFLOW,
} = require('./constants.js');
const { Notice, Plugin, setIcon } = require('obsidian');
const { spawn } = require('child_process');
const ApmCounter = require('../apm/ApmCounter.js');
const boardLibrary = require('./boardLibrary.js');
const CanvasBoardSettings = require('./CanvasBoardSettings.js');
const dagre = require('../../dagre.min.js');
const loadSettings = require('../apm/loadSettings.js');
const claudeBin = require('./claudeBin.js');
const defaultLaunch = require('./defaultLaunch.js');
const FilterPane = require('./FilterPane.js');
const FindBar = require('./FindBar.js');
const fileSystem = require('fs');
const NamePrompt = require('./NamePrompt.js');
const nextTurn = require('./nextTurn.js');
const parseColors = require('./parseColors.js');
const path = require('path');
const Picker = require('./Picker.js');
const UnpackChoice = require('./UnpackChoice.js');

class CanvasBoardPlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
    this.addSettingTab(new CanvasBoardSettings(this.app, this));
    const pluginDir = path.join(
      this.app.vault.adapter.basePath,
      this.manifest.dir,
    );
    const library = boardLibrary;
    const { applyOps, layoutOps } = library;
    this.boardLibrary = library;
    let legacyApm;
    if (!this.settings.apm) {
      try {
        legacyApm = JSON.parse(
          fileSystem.readFileSync(
            path.join(pluginDir, '..', 'apm-counter', 'data.json'),
            'utf8',
          ),
        );
      } catch (error) {
        /* never installed */
      }
    }
    this.settings.apm = loadSettings(this.settings.apm, legacyApm);
    this.apm = new ApmCounter(this, this.settings.apm, () =>
      this.saveData(this.settings),
    );
    this.apm.load();
    this.register(() => this.apm.unload());
    this.api = {
      read: (board) => {
        const canvas = this.openCanvas(board);
        return canvas ? JSON.stringify(canvas.getData()) : null;
      },
      // Changing a card's type needs setData() without the card, then with it, to keep its id.
      apply: async (board, operations) => {
        const canvas = this.openCanvas(board);
        if (!canvas) return null;
        const canvasData = canvas.getData();
        const retyped = applyOps(canvasData, operations);
        if (retyped.length) {
          canvas.setData({
            ...canvasData,
            nodes: canvasData.nodes.filter(
              (node) => !retyped.includes(node.id),
            ),
          });
        }
        canvas.setData(canvasData);
        canvas.requestSave();
        await new Promise((resolve) => setTimeout(resolve, 2500));
        return 'obsidian';
      },
    };
    this.syncSkill(pluginDir);
    this.addCommand({
      id: 'reset-skill',
      name: "Reset agent skill to the plugin's version (overwrites your edits)",
      callback: () => this.syncSkill(pluginDir, true),
    });

    for (const [name, color, key] of COLORS) {
      this.addCommand({
        id: `color-${key}`,
        name: this.colorCommandName(name),
        checkCallback: (checking) => {
          const canvas = this.activeCanvas();
          if (!canvas || canvas.selection.size === 0) return false;
          if (!checking) {
            for (const node of canvas.selection) node.setColor(color);
            canvas.requestSave();
          }
          return true;
        },
      });
    }

    // Selected cards only (2+; the rest never moves): never the whole board unasked (Ctrl+A first). Ctrl+Z undoes it.
    this.addCommand({
      id: 'tidy-layout',
      name: 'Tidy layout (selected cards)',
      checkCallback: (checking) => {
        const canvas = this.activeCanvas();
        if (!canvas) return false;
        if (!checking) {
          if (canvas.selection.size < 2) {
            new Notice(
              'Tidy layout: select the cards to tidy first (2 or more; Ctrl+A for the whole canvas).',
            );
            return true;
          }
          const ids = [...canvas.selection].map((node) => node.id);
          const canvasData = canvas.getData();
          this.edit(
            canvas,
            layoutOps(canvasData, {
              ids,
              direction: this.settings.layoutDirection,
              dagre,
              flow: this.settings.foldDirection,
            }),
            canvasData,
          );
        }
        return true;
      },
    });
    this.addCommand({
      id: 'tidy-direction-next',
      name: 'Tidy layout direction: next',
      callback: () => this.cycleLayoutDirection(),
    });
    for (const [direction, { name }] of Object.entries(LAYOUT_DIRS)) {
      this.addCommand({
        id: `tidy-direction-${direction.toLowerCase()}`,
        name: `Tidy layout direction: ${name}`,
        checkCallback: (checking) => {
          if (this.settings.layoutDirection === direction) return false;
          if (!checking) this.setLayoutDirection(direction);
          return true;
        },
      });
    }

    // Refactor and archive commands: one undo step each (Ctrl+Z), same code as canvas.js for agents.
    // Each is also a right-click item (label `menu`) on the cards it applies to.
    // `menu` is [title, Lucide icon], or null for a command with no menu item.
    const actions = (this.actions = []);
    const runAction = (this.runAction = (run, canvas, sel) =>
      Promise.resolve(run(canvas, sel)).catch(
        (error) => new Notice(`Kanvas board: ${error.message}`),
      ));
    const canvasCommand = (id, name, menu, test, run) => {
      actions.push({ id, menu, test, run });
      this.addCommand({
        id,
        name,
        checkCallback: (checking) => {
          const canvas = this.activeCanvas();
          if (!canvas || !test(canvas, [...canvas.selection])) return false;
          if (!checking) runAction(run, canvas, [...canvas.selection]);
          return true;
        },
      });
    };
    const isText = (node) => node.getData().type === 'text';

    // Pack / unpack (ids stay collapse / expand so hotkeys keep working). Pack moves cards into a new subcanvas.
    canvasCommand(
      'collapse',
      'Pack into subcanvas',
      ['Pack into subcanvas', 'package'],
      (canvas, sel) => sel.length > 0,
      (canvas, sel) =>
        new NamePrompt(this.app, 'Subcanvas name', async (name) => {
          const board = this.activeFile();
          const folder =
            board.parent && board.parent.path !== '/'
              ? board.parent.path + '/'
              : '';
          const file = this.freePath(folder, name, '.canvas');
          const { operations, sub } = library.collapseOps(
            canvas.getData(),
            sel.map((node) => node.id),
            file,
            name,
          );
          await this.app.vault.create(file, JSON.stringify(sub, null, '\t'));
          this.edit(canvas, operations);
          this.undoNotice(
            canvas,
            `packed ${sel.length} card${sel.length > 1 ? 's' : ''} into ${file}`,
            [file],
          );
        }).open(),
    );

    // Unpack (dissolve) = cut and paste: the cards come out, the file goes to the trash. Other links to the file
    // (cards on any canvas, notes) would break: then a choice. Unpack (copy) = copy and paste: the file stays.
    const linked = (canvas, sel) =>
      sel.length === 1 && !!this.linkedCanvas(sel[0]);
    canvasCommand(
      'expand',
      'Unpack subcanvas (dissolve)',
      ['Unpack subcanvas (dissolve)', 'package-open'],
      linked,
      async (canvas, [node]) => {
        const file = this.linkedCanvas(node);
        const links = await this.subcanvasLinks(file, canvas, node.id);
        if (!links.length) return this.unpack(canvas, node, file, 'dissolve');
        new UnpackChoice(this.app, file, links, (mode) =>
          this.unpack(canvas, node, file, mode, links).catch(
            (error) => new Notice(`Kanvas board: ${error.message}`),
          ),
        ).open();
      },
    );
    canvasCommand(
      'unpack-copy',
      'Unpack subcanvas (copy)',
      ['Unpack subcanvas (copy)', 'copy'],
      linked,
      (canvas, [node]) =>
        this.unpack(canvas, node, this.linkedCanvas(node), 'copy'),
    );

    canvasCommand(
      'merge',
      'Merge selected cards',
      ['Merge cards', 'merge'],
      (canvas, sel) => sel.length > 1 && sel.every(isText),
      (canvas, sel) =>
        this.edit(
          canvas,
          library.mergeOps(
            canvas.getData(),
            sel.map((node) => node.id),
          ),
        ),
    );

    // Only the top-level split is a menu item; the others stay commands.
    for (const [separator, label] of [
      ['paragraph', 'paragraph'],
      ['bullet', 'top-level bullet'],
      ['h1', 'heading 1'],
      ['h2', 'heading 2'],
      ['h3', 'heading 3'],
    ]) {
      canvasCommand(
        `split-${separator}`,
        `Split card by ${label}`,
        separator === 'bullet' ? ['Split by top-level bullet', 'split'] : null,
        (canvas, sel) =>
          sel.length === 1 && isText(sel[0]) && !sel[0].isEditing,
        (canvas, [node]) =>
          this.edit(
            canvas,
            library.splitOps(canvas.getData(), node.id, separator),
          ),
      );
    }

    // The card being edited, with text selected: the selection becomes a new card.
    canvasCommand(
      'extract',
      'Extract current selection to a new card',
      ['Extract current selection to a new card', 'text-select'],
      (canvas, sel) =>
        sel.length === 1 && sel[0].isEditing && !!this.cardEditor(sel[0]),
      (canvas, [node]) => {
        const editor = this.cardEditor(node);
        const part = editor.getSelection();
        if (!part.trim()) throw new Error('select some text in the card first');
        const from = editor.posToOffset(editor.getCursor('from'));
        const before = editor.getValue();
        editor.replaceSelection('');
        node.blur();
        const canvasData = canvas.getData();
        const savedNode = canvasData.nodes.find((x) => x.id === node.id);
        if (savedNode) savedNode.text = before; // the editor may not have saved yet: work from what it showed
        this.edit(
          canvas,
          library.extractOps(canvasData, node.id, part, from),
          canvasData,
        );
      },
    );

    canvasCommand(
      'archive',
      'Archive selected cards',
      ['Archive', 'archive'],
      (canvas, sel) => sel.length > 0,
      async (canvas, sel) => {
        const board = this.activeFile().path;
        const canvasData = canvas.getData();
        const folder = library.archiveDir(board, this.settings);
        if (!this.app.vault.getAbstractFileByPath(folder)) {
          await this.app.vault.createFolder(folder);
        }
        const notes = [];
        for (const node of sel) {
          const archived = library.archiveNote(
            canvasData,
            node.id,
            board,
            window.moment().format('YYYY-MM-DD'),
            this.cardContexts(node, board),
          );
          notes.push(this.freePath(folder + '/', archived.name, '.md'));
          await this.app.vault.create(
            notes[notes.length - 1],
            archived.content,
          );
        }
        this.edit(
          canvas,
          sel.map((node) => ({ op: 'remove', id: node.id })),
        );
        this.undoNotice(
          canvas,
          `archived ${sel.length} card${sel.length > 1 ? 's' : ''}`,
          notes,
        );
      },
    );

    // Fold hides the cards linked to a card, following edges in the "Fold direction" setting (out: the cards it
    // points to, then on; in: the cards pointing to it, then on). Unfold shows N levels again and folds the cards
    // at level N, so a branch opens in stages, like folders. Folds are stored on the card (see foldOf), so Ctrl+Z
    // undoes them. With several cards selected, each one that can be folded (or unfolded) is.
    const canFold = (canvas, node) =>
      !this.foldOf(node) &&
      this.branchLinks(canvas, this.settings.foldDirection).has(node.id);
    canvasCommand(
      'fold',
      'Fold branch',
      ['Fold branch', 'chevrons-down-up'],
      (canvas, sel) => sel.some((node) => canFold(canvas, node)),
      (canvas, sel) =>
        this.setFolds(
          canvas,
          new Map(
            sel
              .filter((node) => canFold(canvas, node))
              .map((node) => [node.id, this.settings.foldDirection]),
          ),
        ),
    );
    for (const [levels, id, name, menu] of [
      [
        1,
        'unfold',
        'Unfold branch 1 level',
        ['Unfold 1 level', 'chevron-down'],
      ],
      [2, 'unfold-2', 'Unfold branch 2 levels', null],
      [3, 'unfold-3', 'Unfold branch 3 levels', null],
      [
        Infinity,
        'unfold-all',
        'Unfold whole branch',
        ['Unfold whole branch', 'chevrons-up-down'],
      ],
    ]) {
      canvasCommand(
        id,
        name,
        menu,
        (canvas, sel) =>
          sel.some((node) => this.unfoldTargets(canvas, node.id).length),
        (canvas, sel) =>
          this.unfold(
            canvas,
            [
              ...new Set(
                sel.flatMap((node) => this.unfoldTargets(canvas, node.id)),
              ),
            ],
            levels,
          ),
      );
    }
    for (const [direction, label] of [
      ['out', 'outgoing (cards it points to)'],
      ['in', 'incoming (cards pointing to it)'],
    ]) {
      this.addCommand({
        id: `fold-direction-${direction}`,
        name: `Fold direction: ${label}`,
        checkCallback: (checking) => {
          if (this.settings.foldDirection === direction) return false;
          if (!checking) {
            this.settings.foldDirection = direction;
            this.saveData(this.settings);
            new Notice(`Kanvas board: fold direction ${label}`);
          }
          return true;
        },
      });
    }

    // Templates: the selection (and edges between its cards) as Templates/Canvas/<name>.canvas. Typing the name
    // suggests the existing templates: picking one (or typing its name) overwrites it, the button says so.
    const templates = () =>
      this.app.vault
        .getFiles()
        .filter(
          (file) =>
            file.extension === 'canvas' &&
            file.path.startsWith(library.TEMPLATE_DIR + '/'),
        );
    const templateName = (file) =>
      file.path.slice(library.TEMPLATE_DIR.length + 1, -'.canvas'.length); // subfolders kept
    canvasCommand(
      'template-save',
      'Save selected cards as a template',
      ['Save as template', 'layout-template'],
      (canvas, sel) => sel.length > 0,
      (canvas) => {
        const existing = new Map(
          templates().map((file) => [templateName(file).toLowerCase(), file]),
        );
        new NamePrompt(
          this.app,
          'Template name',
          async (name) => {
            const content = JSON.stringify(
              (({ nodes, edges }) => ({ nodes, edges }))(
                canvas.getSelectionData(),
              ),
              null,
              '\t',
            );
            const old = existing.get(name.toLowerCase());
            if (old) {
              await this.app.vault.modify(old, content);
              new Notice(`Kanvas board: template ${old.path} overwritten`);
              return;
            }
            if (!this.app.vault.getAbstractFileByPath(library.TEMPLATE_DIR)) {
              await this.app.vault.createFolder(library.TEMPLATE_DIR);
            }
            const file = this.freePath(
              library.TEMPLATE_DIR + '/',
              name,
              '.canvas',
            );
            await this.app.vault.create(file, content);
            new Notice(`Kanvas board: template saved to ${file}`);
          },
          {
            suggestions: [...existing.values()].map(templateName),
            overwrite: (name) => existing.has(name.toLowerCase()),
          },
        ).open();
      },
    );
    // Selection tools: the selection grows to related cards (visible ones only: hidden cards never stay selected).
    // Children: every level down, in the fold direction. The selected cards stay selected.
    const cards = (sel) =>
      sel.filter((node) => !node.from && node.getData().type !== 'group');
    const selectMore = (this.selectMore = (canvas, sel, keep) => {
      const add = [...canvas.nodes.values()].filter(
        (node) =>
          node.getData().type !== 'group' &&
          !this.isHidden(canvas, node) &&
          keep(node),
      );
      canvas.updateSelection(() => {
        canvas.selection.clear();
        for (const node of [...sel, ...add]) canvas.selection.add(node);
      });
      return add.length;
    });
    const childIds = (canvas, sel) =>
      new Set(
        cards(sel).flatMap((node) =>
          this.branchLevels(
            canvas,
            node.id,
            this.settings.foldDirection,
          ).flat(),
        ),
      );
    canvasCommand(
      'select-children',
      'Select children (all levels down, in the fold direction)',
      ['Select children', 'list-tree'],
      (canvas, sel) =>
        [...childIds(canvas, sel)].some(
          (id) =>
            canvas.nodes.get(id) &&
            !this.isHidden(canvas, canvas.nodes.get(id)) &&
            !canvas.selection.has(canvas.nodes.get(id)),
        ),
      (canvas, sel) => {
        const ids = childIds(canvas, sel);
        selectMore(canvas, sel, (node) => ids.has(node.id));
      },
    );
    const tagsOf = (sel) =>
      new Set(cards(sel).flatMap((node) => [...this.cardTagSet(node)]));
    canvasCommand(
      'select-same-tag',
      'Select cards with the same tag',
      ['Select same tag', 'tag'],
      (canvas, sel) => tagsOf(sel).size > 0,
      (canvas, sel) => {
        const tags = tagsOf(sel);
        selectMore(canvas, sel, (node) =>
          [...this.cardTagSet(node)].some((tag) => tags.has(tag)),
        );
      },
    );
    canvasCommand(
      'select-same-color',
      'Select cards with the same color',
      ['Select same color', 'palette'],
      (canvas, sel) => cards(sel).length > 0,
      (canvas, sel) => {
        const colors = new Set(
          cards(sel).map((node) => node.getData().color || ''),
        );
        selectMore(canvas, sel, (node) =>
          colors.has(node.getData().color || ''),
        );
      },
    );

    this.addCommand({
      id: 'template-insert',
      name: 'Insert cards from template',
      checkCallback: (checking) => {
        const canvas = this.activeCanvas();
        if (!canvas) return false;
        if (!checking) {
          const files = this.app.vault
            .getFiles()
            .filter(
              (file) =>
                file.extension === 'canvas' &&
                file.path.startsWith(library.TEMPLATE_DIR + '/'),
            );
          if (!files.length) {
            new Notice(
              `Kanvas board: no template in ${library.TEMPLATE_DIR} (Save selected cards as a template)`,
            );
          } else {
            new Picker(
              this.app,
              'Template',
              files,
              (file) => file.basename,
              (file) => this.insertTemplate(canvas, file),
            ).open();
          }
        }
        return true;
      },
    });

    // Search, filter: the active canvas only. Filter and folds hide cards (styles.css). The filter is
    // view only (the file is untouched, it resets when the board is reopened); folds are in the file.
    this.views = new WeakMap(); // canvas → { xcolors, xtags (hidden colors and tags), hidden (card ids) }
    this.panes = new Map(); // canvas → FilterPane, one per open canvas
    // A find bar like the one in notes (count, previous / next, all), named after Obsidian's "Search current file".
    this.finds = new Map(); // canvas → FindBar
    this.addCommand({
      id: 'find',
      name: 'Search current canvas',
      checkCallback: (checking) => {
        const canvas = this.activeCanvas();
        if (!canvas) return false;
        if (!checking) {
          let findBar = this.finds.get(canvas);
          if (!findBar) {
            findBar = new FindBar(this, canvas);
            this.finds.set(canvas, findBar);
          }
          findBar.open();
        }
        return true;
      },
    });
    this.addCommand({
      id: 'filter',
      name: 'Toggle filter pane',
      checkCallback: (checking) => {
        const canvas = this.activeCanvas();
        if (!canvas) return false;
        if (!checking) this.pane(canvas).toggle();
        return true;
      },
    });
    this.addCommand({
      id: 'show-all',
      name: 'Unhide all',
      checkCallback: (checking) => {
        const canvas = this.activeCanvas();
        if (!canvas || !this.viewLabel(canvas)) return false;
        if (!checking) this.showAll(canvas);
        return true;
      },
    });

    // Right-click on one card, on a selection, or inside a card being edited (Extract).
    const addActions = (menu, canvas, sel) => {
      for (const action of actions) {
        if (action.menu && action.test(canvas, sel)) {
          menu.addItem((item) =>
            item
              .setTitle(this.keyedTitle(action.menu[0], action.id))
              .setIcon(action.menu[1])
              .setSection('canvas-board')
              .onClick(() => runAction(action.run, canvas, sel)),
          );
        }
      }
    };
    this.registerEvent(
      this.app.workspace.on('canvas:selection-menu', (menu, canvas) =>
        addActions(menu, canvas, [...canvas.selection]),
      ),
    );
    this.registerEvent(
      this.app.workspace.on('canvas:node-menu', (menu, node) =>
        addActions(
          menu,
          node.canvas,
          node.canvas.selection.has(node) ? [...node.canvas.selection] : [node],
        ),
      ),
    );
    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu, editor) => {
        const canvas = this.activeCanvas();
        const node =
          canvas &&
          [...canvas.selection].find(
            (node) => node.isEditing && this.cardEditor(node) === editor,
          );
        if (node) addActions(menu, canvas, [node]);
      }),
    );

    const isArchived = (file) => {
      const frontmatter =
        file &&
        file.extension === 'md' &&
        (this.app.metadataCache.getFileCache(file) || {}).frontmatter;
      return !!(frontmatter && frontmatter['archived-from']);
    };
    this.addCommand({
      id: 'restore',
      name: 'Restore archived card (from its archive note)',
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!isArchived(file)) return false;
        if (!checking) {
          this.restore(file).catch(
            (error) => new Notice(`Kanvas board: ${error.message}`),
          );
        }
        return true;
      },
    });
    // Right-click on an archive note: a link to it, the file explorer, its tab.
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        if (isArchived(file)) {
          menu.addItem((item) =>
            item
              .setTitle('Restore archived card')
              .setIcon('archive-restore')
              .setSection('canvas-board')
              .onClick(() =>
                this.restore(file).catch(
                  (error) => new Notice(`Kanvas board: ${error.message}`),
                ),
              ),
          );
        }
      }),
    );

    this.addCommand({
      id: 'run-pass',
      name: 'Run pass (recheck the board)',
      callback: () => this.runPass(),
    });
    this.addCommand({
      id: 'open-board',
      name: 'Open the board',
      callback: () => this.openBoard(),
    });
    this.addCommand({
      id: 'create-starter-board',
      name: 'Create a starter board (color legend and first cards)',
      callback: () => this.createStarterBoard(),
    });
    this.addRibbonIcon('kanban-square', 'Open the board (Kanvas board)', () =>
      this.openBoard(),
    );

    // Card count of the active canvas in the status bar: boards get hard to manage past a threshold.
    // Next to it, the active filter and folds; click to change them.
    this.countEl = this.addStatusBarItem();
    this.viewEl = this.addStatusBarItem();
    this.viewEl.addClass('mod-clickable');
    this.viewEl.onClickEvent(() => {
      const canvas = this.activeCanvas();
      if (canvas) this.pane(canvas).toggle(true);
    });
    const tick = () => {
      this.updateCount();
      // Cards that come into view or are added get the classes again. Every open canvas has its filter pane.
      const open = new Set();
      for (const leaf of this.app.workspace.getLeavesOfType('canvas')) {
        const canvas = leaf.view.canvas;
        if (!canvas || !canvas.wrapperEl) continue;
        open.add(canvas);
        this.decorate(leaf.view);
        this.refreshView(canvas); // folds come with the file: every canvas
        this.pane(canvas).update();
      }
      for (const [canvas, pane] of this.panes) {
        if (!open.has(canvas)) {
          pane.destroy();
          this.panes.delete(canvas);
        }
      }
      for (const [canvas, findBar] of this.finds) {
        if (!open.has(canvas)) {
          findBar.destroy();
          this.finds.delete(canvas);
        }
      }
    };
    this.registerEvent(this.app.workspace.on('active-leaf-change', tick));
    this.registerInterval(window.setInterval(tick, 2000));
    tick();
    this.register(() => {
      for (const pane of this.panes.values()) pane.destroy();
      this.panes.clear();
      for (const findBar of this.finds.values()) findBar.destroy();
      this.finds.clear();
      for (const leaf of this.app.workspace.getLeavesOfType('canvas')) {
        const canvas = leaf.view.canvas;
        this.undecorate(leaf.view);
        if (!this.views.has(canvas)) continue;
        delete canvas.updateSelection;
        delete canvas.applyHistory;
        this.paint(canvas, new Set(), new Map()); // folds stay in the file, only the screen is cleared
      }
    });
  }

  // --- Presentation: where the commands show on screen ---------------------------------------------------------
  // Control bar and selection toolbar are undocumented canvas DOM (.canvas-controls, canvas.menu.render), like
  // folds and the filter pane: an Obsidian update may drop those buttons, the commands stay. Header action and
  // ribbon icon are documented API. See "Obsidian internals" in README.md.

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

  // An edited label also renames its command in the palette and the hotkey list. The id, and so the key, stays.
  async setColorLabel(name, label) {
    const labels = (this.settings.colorLabels = {
      ...this.settings.colorLabels,
    });
    if (label) labels[name] = label;
    else delete labels[name];
    await this.saveData(this.settings);
    const row = COLORS.find((colorRow) => colorRow[0] === name);
    const cmd =
      this.app.commands &&
      this.app.commands.commands[`${this.manifest.id}:color-${row[2]}`];
    if (cmd) cmd.name = `${this.manifest.name}: ${this.colorCommandName(name)}`;
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

  // Tooltip with its key, the way the canvas's own buttons show it ("Zoom to selection\n(Shift + 2)").
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

  // A notice with an Undo button: one canvas undo step and the files the action made go to the trash. Only while
  // the board has not changed since (else the undo would take back something else).
  // `restore` ({ path, content }) brings a trashed file back on undo (unpack). Redirected links are not undone.
  undoNotice(canvas, message, files = [], restore = null) {
    const history = canvas.history;
    const historyIndex = history ? history.current : null;
    const frag = createFragment((fragment) => {
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
    new Notice(frag, 8000);
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

  // Onboarding: the default board when it does not exist yet, else "Starter board.canvas" (numbered when taken).
  // A legend group (one card per color: its label and what it does, from Settings > Workflow) and a group of
  // first steps, one of them a wish to color cyan and run a pass on. Opens it.
  async createStarterBoard() {
    const vault = this.app.vault;
    let board = this.settings.defaultBoard;
    if (vault.getAbstractFileByPath(board)) {
      const folder =
        path.posix.dirname(board) === '.'
          ? ''
          : `${path.posix.dirname(board)}/`;
      let suffix = 1;
      do
        board = `${folder}Starter board${suffix > 1 ? ` ${suffix}` : ''}.canvas`;
      while (vault.getAbstractFileByPath(board) && ++suffix);
    }
    const id = () =>
      Array.from({ length: 16 }, () =>
        Math.floor(Math.random() * 16).toString(16),
      ).join('');
    const nodes = [];
    const edges = [];
    const columnWidth = 400;
    nodes.push({
      id: id(),
      type: 'group',
      label: 'How the colors work',
      x: -40,
      y: -80,
      width: columnWidth + 80,
      height: WORKFLOW.length * 100 + 100,
    });
    // Legend cards stay uncolored (a colored one would be state: a pass would take the cyan and purple ones),
    // an emoji dot stands for the color.
    const DOT = {
      cyan: '🔵',
      purple: '🟣',
      orange: '🟠',
      yellow: '🟡',
      red: '🔴',
      green: '🟢',
      none: '⚪',
    };
    WORKFLOW.forEach(([name, meaning], index) => {
      nodes.push({
        id: id(),
        type: 'text',
        text: `${DOT[name]} **${this.colorLabel(name)}** (${COLOR_NUM[name] ? name : 'uncolored'})\n${meaning}`,
        x: 0,
        y: index * 100,
        width: columnWidth,
        height: 80,
      });
    });
    const steps = [
      '**1. Write a wish**\nOne card, one thing you want done, in your own words. Uncolored cards are ideas: the agent never touches them.',
      '**2. Color it**\nCyan: the agent carries it to done. Purple: one step (a brief, then a plan), then it hands back. Color hotkeys: Settings > Kanvas board > Hotkeys.',
      '**3. Run a pass**\nCommand "Kanvas board: Run pass". A terminal opens with the agent on this board; it turns the cards it takes orange.',
      "**4. Answer**\nYellow: a question or a review for you, in the card's note. Answer there, color the card cyan or purple again, run the next pass.",
    ];
    const stepsX = columnWidth + 160;
    nodes.push({
      id: id(),
      type: 'group',
      label: 'First steps',
      x: stepsX - 40,
      y: -80,
      width: columnWidth + 80,
      height: steps.length * 160 + 280,
    });
    let previous;
    steps.forEach((text, index) => {
      const card = {
        id: id(),
        type: 'text',
        text,
        x: stepsX,
        y: index * 160,
        width: columnWidth,
        height: 130,
      };
      nodes.push(card);
      if (previous) {
        edges.push({
          id: id(),
          fromNode: previous,
          fromSide: 'bottom',
          toNode: card.id,
          toSide: 'top',
        });
      }
      previous = card.id;
    });
    nodes.push({
      id: id(),
      type: 'text',
      text: 'Try it: color this card cyan, then run a pass.\n\nWrite a short note that explains this board in my own words.',
      x: stepsX,
      y: steps.length * 160 + 20,
      width: columnWidth,
      height: 130,
    });
    try {
      const folder = path.posix.dirname(board);
      if (folder !== '.' && !vault.getAbstractFileByPath(folder)) {
        await vault.createFolder(folder);
      }
      const file = await vault.create(
        board,
        JSON.stringify({ nodes, edges }, null, '\t'),
      );
      await this.app.workspace.getLeaf(false).openFile(file);
      new Notice(`Kanvas board: starter board created (${board})`);
    } catch (error) {
      new Notice(
        `Kanvas board: could not create the starter board (${error.message})`,
      );
    }
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

  // Runs a plugin command on this canvas view (made active first: a click on its buttons may not focus it).
  runOn(view, id) {
    const leaf = this.app.workspace
      .getLeavesOfType('canvas')
      .find((leaf) => leaf.view === view);
    if (leaf && this.app.workspace.activeLeaf !== leaf) {
      this.app.workspace.setActiveLeaf(leaf, { focus: true });
    }
    this.app.commands.executeCommandById(`${this.manifest.id}:${id}`);
  }

  // Buttons on a canvas view, added once (tick runs every 2 s and adds back what the canvas redrew away).
  decorate(view) {
    const canvas = view.canvas;
    // View header: Run pass, a command about the whole board.
    if (!view.canvasBoardAction && view.addAction) {
      view.canvasBoardAction = view.addAction('play', 'Run pass', () =>
        this.runPass(),
      );
    }
    if (view.canvasBoardAction) {
      view.canvasBoardAction.setAttr(
        'aria-label',
        this.keyedLabel('Run pass', 'run-pass'),
      );
    }
    // Control bar (top right): Search, Filter, Tidy layout, above Canvas help.
    const controls =
      canvas.wrapperEl && canvas.wrapperEl.querySelector('.canvas-controls');
    if (controls) {
      let group = controls.querySelector('.canvas-board-controls');
      if (!group) {
        group = createDiv({
          cls: 'canvas-control-group mod-raised canvas-board-controls',
        });
        const help = controls.lastElementChild;
        controls.insertBefore(group, help);
        for (const [id, label, icon] of [
          ['find', 'Search current canvas', 'search'],
          ['filter', 'Filter cards', 'filter'],
          ['tidy-layout', 'Tidy layout', 'network'],
        ]) {
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
            if (id === 'tidy-layout' && event.shiftKey) {
              this.cycleLayoutDirection();
            } else this.runOn(view, id);
          });
        }
      }
      for (const button of group.children) {
        button.setAttr(
          'aria-label',
          this.keyedLabel(button.dataset.label, button.dataset.command),
        );
      }
      // The tidy icon points the way the layout flows; its tooltip says so and how to change it.
      const tidy = group.querySelector('[data-command="tidy-layout"]');
      const direction =
        LAYOUT_DIRS[this.settings.layoutDirection] || LAYOUT_DIRS.TB;
      if (tidy) {
        this.tidyTurn = nextTurn(
          this.tidyTurn ?? direction.turn,
          direction.turn,
        );
        tidy.style.setProperty(
          '--canvas-board-tidy-turn',
          `${this.tidyTurn}deg`,
        );
        tidy.setAttr(
          'aria-label',
          this.keyedLabel(
            `Tidy layout: ${direction.name}\nShift-click: next direction`,
            'tidy-layout',
          ),
        );
      }
    }
    // Selection toolbar: Fold, Unfold, Archive after the canvas's own buttons, when they apply.
    const menu = canvas.menu;
    if (menu && menu.render && !menu.canvasBoardRender) {
      const orig = (menu.canvasBoardRender = menu.render);
      const plugin = this;
      menu.render = function (...values) {
        const result = orig.apply(this, values);
        try {
          plugin.menuButtons(canvas);
        } catch (error) {
          console.error('canvas-board: selection toolbar', error);
        }
        return result;
      };
      // The color picker opens on click: its swatches get the state as tooltip.
      menu.canvasBoardObserver = new MutationObserver(() => {
        for (const item of menu.menuEl.querySelectorAll(
          '.canvas-color-picker-item:not(.canvas-color-picker-custom)',
        )) {
          const color =
            (item.className.match(/mod-canvas-color-(\d)/) || [])[1] || '';
          const row = COLORS.find((x) => x[1] === color);
          if (row) {
            item.setAttrs({
              'aria-label': this.keyedLabel(
                this.colorLabel(row[0]),
                `color-${row[2]}`,
              ),
              'data-tooltip-position': 'top',
            });
          }
        }
      });
      menu.canvasBoardObserver.observe(menu.menuEl, {
        childList: true,
        subtree: true,
      });
    }
  }

  menuButtons(canvas) {
    const element = canvas.menu.menuEl;
    const sel = [...canvas.selection];
    if (
      !sel.length ||
      !element.childElementCount ||
      element.querySelector('.canvas-board-menu-btn')
    ) {
      return;
    }
    for (const id of ['fold', 'unfold', 'archive']) {
      const action = this.actions.find((x) => x.id === id);
      if (!action || !action.test(canvas, sel)) continue;
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

  // Filter state of an open canvas. `create` false only reads (an empty state, not stored).
  viewState(canvas, create = true) {
    const empty = () => ({
      xcolors: new Set(),
      xtags: new Set(),
      hidden: new Set(),
    });
    let state = this.views.get(canvas);
    if (state || !create) return state || empty();
    state = empty();
    this.views.set(canvas, state);
    // Hidden cards never stay selected (select all, drag to select), so Delete never hits a card you can't see.
    const plugin = this;
    const orig = canvas.updateSelection;
    canvas.updateSelection = function (callback) {
      const result = orig.call(this, () => {
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
    return this.viewState(canvas, false).hidden.has(node.id);
  }

  // Clears the filter and unfolds every card (one undo step for the folds).
  showAll(canvas) {
    const state = this.viewState(canvas, false);
    state.xcolors.clear();
    state.xtags.clear();
    const folds = this.folds(canvas);
    if (folds.size) {
      this.setFolds(canvas, new Map([...folds.keys()].map((id) => [id, null])));
    } else this.refreshView(canvas);
  }

  // A fold is stored on the card as "canvasBoard": {"folded": "in" | "out"} (the fold direction). JSON Canvas
  // 1.0 has no such field; other readers ignore it and show every card. Obsidian keeps it (node.unknownData).
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

  // `changes`: card id → direction to fold, or null to unfold. One canvas edit, one undo step.
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

  // Card id → ids one edge away, following edges out (from → to) or in (to → from).
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
    const links = this.branchLinks(canvas, direction);
    const seen = new Set([root]);
    const levels = [];
    let level = [root];
    while (level.length) {
      const next = [];
      for (const id of level) {
        for (const x of links.get(id) || []) {
          if (!seen.has(x)) {
            seen.add(x);
            next.push(x);
          }
        }
      }
      if (next.length) levels.push(next);
      level = next;
    }
    return levels;
  }

  // The cards an unfold on `id` applies to: the card itself if folded, else the nearest folded cards of its open
  // branch (in the fold direction, not past another fold), so pressing unfold again opens the next level.
  unfoldTargets(canvas, id) {
    const node = canvas.nodes.get(id);
    if (!node) return [];
    if (this.foldOf(node)) return [id];
    const links = this.branchLinks(canvas, this.settings.foldDirection);
    const seen = new Set([id]);
    const found = [];
    let level = [id];
    while (level.length) {
      const next = [];
      for (const x of level) {
        for (const y of links.get(x) || []) {
          if (seen.has(y)) continue;
          seen.add(y);
          const node = canvas.nodes.get(y);
          if (node && this.foldOf(node)) found.push(y);
          else next.push(y);
        }
      }
      level = next;
    }
    return found;
  }

  // Shows `levels` levels of each folded branch; the cards at the last shown level that lead further get folded.
  unfold(canvas, ids, levels) {
    const changes = new Map();
    for (const id of ids) {
      const node = canvas.nodes.get(id);
      const direction = node && this.foldOf(node);
      if (!direction) continue;
      changes.set(id, null);
      const below = this.branchLevels(canvas, id, direction);
      const links = this.branchLinks(canvas, direction);
      if (levels < below.length) {
        for (const x of below[levels - 1]) {
          if ((links.get(x) || []).length) changes.set(x, direction);
        }
      }
    }
    this.setFolds(canvas, changes);
  }

  // Tags of a card (no #): the `#tags` in its own text, never those of the notes it links. Exact match only:
  // #tag1 is not #tag10.
  cardTagSet(node) {
    const tags = new Set();
    for (const match of (node.getData().text || '').matchAll(
      /(?:^|\s)#([^\s#.,;:!?()[\]{}"'`]+)/g,
    )) {
      if (!/^\d+$/.test(match[1])) tags.add(match[1]);
    }
    return tags;
  }

  // Every color and tag shows by default; a hidden color, or any hidden tag, hides the card.
  matches(node, state) {
    if (state.xcolors.has(node.getData().color || '')) return false;
    if (!state.xtags.size) return true;
    const tags = this.cardTagSet(node);
    return ![...state.xtags].some((tag) => tags.has(tag));
  }

  filtering(state) {
    return !!(state.xcolors.size || state.xtags.size);
  }

  // Hidden = not matching the filter (groups always show), or below a folded card. With the setting "Hide cards
  // under hidden tags", a card hidden by a tag also hides its branch, as a fold in the fold direction would.
  refreshView(canvas) {
    const state = this.viewState(canvas);
    const hidden = new Set();
    if (this.filtering(state)) {
      for (const node of canvas.nodes.values()) {
        if (node.getData().type !== 'group' && !this.matches(node, state)) {
          hidden.add(node.id);
        }
      }
    }
    if (state.xtags.size && this.settings.hideTagBranches) {
      for (const node of canvas.nodes.values()) {
        const tags = this.cardTagSet(node);
        if (![...state.xtags].some((tag) => tags.has(tag))) continue;
        for (const id of this.branchLevels(
          canvas,
          node.id,
          this.settings.foldDirection,
        ).flat()) {
          if (
            canvas.nodes.get(id) &&
            canvas.nodes.get(id).getData().type !== 'group'
          ) {
            hidden.add(id);
          }
        }
      }
    }
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

  // Hides the `hidden` cards and their edges; `folded` (id → count) gets the "· N folded" badge, a click on it
  // unfolds one level.
  paint(canvas, hidden, folded) {
    for (const node of canvas.nodes.values()) {
      node.nodeEl.toggleClass('canvas-board-hidden', hidden.has(node.id));
      let badge = node.nodeEl.querySelector(':scope > .canvas-board-folded');
      if (!folded.has(node.id)) {
        if (badge) badge.remove();
        continue;
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
      badge.setText(`· ${folded.get(node.id)} folded`);
      badge.setAttr('aria-label', this.keyedLabel('Unfold 1 level', 'unfold'));
    }
    this.paintStale(canvas);
    for (const edge of canvas.edges.values()) {
      const off = hidden.has(edge.from.node.id) || hidden.has(edge.to.node.id);
      for (const element of [
        edge.lineGroupEl,
        edge.lineEndGroupEl,
        edge.labelElement && edge.labelElement.wrapperEl,
      ]) {
        if (element) element.classList.toggle('canvas-board-hidden', off);
      }
    }
  }

  // Yellow (needs me) cards whose note was not touched for "Stale after" days: a warning badge (the icon of
  // `- [!]`) with the time since the note last changed. Cards without a note have no date: no badge.
  paintStale(canvas) {
    const days = Number(this.settings.staleDays) || 0;
    const board = canvas.view && canvas.view.file ? canvas.view.file.path : '';
    for (const node of canvas.nodes.values()) {
      const nodeData = node.getData();
      let age = -1;
      if (days > 0 && nodeData.color === '3') {
        let file = null;
        if (nodeData.type === 'file') {
          file = this.app.vault.getAbstractFileByPath(nodeData.file);
        } else if (nodeData.type === 'text') {
          const match = /\[\[([^\]|#]+)/.exec(nodeData.text || '');
          if (match) {
            file = this.app.metadataCache.getFirstLinkpathDest(
              match[1].trim(),
              board,
            );
          }
        }
        if (file && file.stat) {
          age = Math.floor((Date.now() - file.stat.mtime) / 86400000);
        }
      }
      let badge = node.nodeEl.querySelector(':scope > .canvas-board-stale');
      if (age < days || age < 0) {
        if (badge) badge.remove();
        continue;
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
      if (badge.dataset.age !== label) {
        badge.dataset.age = label;
        badge.querySelector('.canvas-board-stale-text').setText(label);
        badge.setAttr(
          'aria-label',
          `Waiting on you · note untouched for ${age} day${age === 1 ? '' : 's'} (stale after ${days})`,
        );
      }
    }
  }

  // Status bar and closed pane: only how many cards are hidden (filter and folds); the pane says by what.
  viewLabel(canvas) {
    const hiddenCount = this.viewState(canvas, false).hidden.size;
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

  // Background of a color dot: a preset canvas color ('1'…'6'), a custom hex, or none.
  dotStyle(color) {
    return !color
      ? ''
      : `background: ${color.startsWith('#') ? color : `var(--canvas-color-${color})`}`;
  }

  // Template cards are centered on the visible canvas, whatever is selected; they end up selected.
  async insertTemplate(canvas, file) {
    const tpl = JSON.parse(await this.app.vault.read(file));
    const nodes = tpl.nodes || [];
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
    const operations = this.boardLibrary.templateOps(tpl, origin);
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
    const over = max > 0 && cards.length > max;
    const sel = [...canvas.selection].filter((x) => !x.from).length; // cards and groups, not edges
    // Only the card count takes the warning color, not the selected count.
    this.countEl.empty();
    this.countEl.createSpan({
      text: `${cards.length} cards`,
      cls: over ? 'canvas-board-over' : '',
    }); // warning color, see styles.css
    if (sel) this.countEl.appendText(` · ${sel} selected`);
    this.countEl.setAttr(
      'aria-label',
      (over ? `over ${max} · ` : '') +
        Object.entries(byColor)
          .map(([colorName, count]) => `${colorName} ${count}`)
          .join(' · '),
    );
    this.countEl.setAttr('data-tooltip-position', 'top');
    this.countEl.show();
  }

  // The plugin folder holds the skill's default; the vault copy is written only when missing (then it is the
  // user's, plugin updates never overwrite it) or on "Reset agent skill" (`force`).
  skillPath() {
    return path.join(
      this.app.vault.adapter.basePath,
      '.claude',
      'skills',
      'canvas-board',
      'SKILL.md',
    );
  }

  syncSkill(pluginDir, force = false) {
    const source = path.join(pluginDir, 'skill', 'SKILL.md');
    const dest = this.skillPath();
    try {
      if (!force && fileSystem.existsSync(dest)) return;
      fileSystem.mkdirSync(path.dirname(dest), { recursive: true });
      fileSystem.copyFileSync(source, dest);
      if (force) {
        new Notice("Kanvas board: agent skill reset to the plugin's version");
      }
    } catch (error) {
      console.error('canvas-board: skill sync failed', error);
      if (force) {
        new Notice(`Kanvas board: skill reset failed (${error.message})`);
      }
    }
  }

  // One undo step: the state before is pushed (unless the history already ends with it), then the edited data
  // is set, which pushes it, so Ctrl+Z and Ctrl+Y each take one step. `d` is passed when the caller already changed it (extract).
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
    canvas.requestSave(false); // without false it pushes it again a moment later: one more Ctrl+Z needed
  }

  activeFile() {
    const view =
      this.app.workspace.activeLeaf && this.app.workspace.activeLeaf.view;
    return view && view.file;
  }

  freePath(folder, name, ext) {
    for (let attempt = 1; ; attempt++) {
      const candidate = `${folder}${name}${attempt > 1 ? ' ' + attempt : ''}${ext}`;
      if (!this.app.vault.getAbstractFileByPath(candidate)) return candidate;
    }
  }

  // Cards (on any canvas) and notes that link `file`, except card `skipId` on `canvas`: [{ path, id?, label }].
  async subcanvasLinks(file, canvas, skipId) {
    const out = [];
    const here = this.canvasFile(canvas);
    const hits = (from) => (target) => {
      const destination = this.app.metadataCache.getFirstLinkpathDest(
        target,
        from,
      );
      return !!destination && destination.path === file.path;
    };
    for (const canvasFile of this.app.vault
      .getFiles()
      .filter(
        (candidateFile) =>
          candidateFile.extension === 'canvas' &&
          candidateFile.path !== file.path,
      )) {
      const open =
        canvasFile.path === here ? canvas : this.openCanvas(canvasFile.path);
      let canvasData;
      try {
        canvasData = open
          ? open.getData()
          : JSON.parse((await this.app.vault.cachedRead(canvasFile)) || '{}');
      } catch (error) {
        continue;
      }
      for (const node of canvasData.nodes || []) {
        if (canvasFile.path === here && node.id === skipId) continue;
        const hit =
          node.type === 'file'
            ? node.file === file.path
            : node.type === 'text' &&
              this.boardLibrary.relinkText(
                node.text,
                hits(canvasFile.path),
                () => '\u0000',
              ) !== node.text;
        if (hit) {
          out.push({
            path: canvasFile.path,
            id: node.id,
            label: (node.text || node.file || '').split('\n')[0],
          });
        }
      }
    }
    const resolved = this.app.metadataCache.resolvedLinks;
    for (const source in resolved) {
      if (
        source !== file.path &&
        !source.endsWith('.canvas') &&
        resolved[source][file.path]
      ) {
        out.push({ path: source, label: source });
      }
    }
    return out;
  }

  canvasFile(canvas) {
    const leaf = this.app.workspace
      .getLeavesOfType('canvas')
      .find((leaf) => leaf.view.canvas === canvas);
    return leaf && leaf.view.file ? leaf.view.file.path : null;
  }

  // mode: dissolve (file to trash, other links break), copy (file kept), group (cards in a group named after the
  // file, other links redirected: cards on this board get an edge to the group, other cards and notes link this board).
  async unpack(canvas, node, file, mode, links = []) {
    const sub = JSON.parse((await this.app.vault.read(file)) || '{}');
    const content = JSON.stringify(
      { nodes: sub.nodes || [], edges: sub.edges || [] },
      null,
      '\t',
    );
    const label = (
      ((node.getData().text || '').match(/\|([^\]]+)\]\]/) || [])[1] ||
      file.basename
    ).trim(); // the card's alias, else the file name
    const operations = this.boardLibrary.expandOps(
      canvas.getData(),
      node.id,
      { nodes: sub.nodes || [], edges: sub.edges || [] },
      mode === 'group' ? { group: label } : {},
    );
    const here = this.canvasFile(canvas);
    const isSub = (from) => (target) => {
      const destination = this.app.metadataCache.getFirstLinkpathDest(
        target,
        from,
      );
      return !!destination && destination.path === file.path;
    };
    if (mode === 'group') {
      const [fromSide, toSide] =
        this.boardLibrary.SIDES[this.settings.layoutDirection] ||
        this.boardLibrary.SIDES.TB;
      for (const link of links.filter((link) => link.path === here)) {
        const node = canvas.getData().nodes.find((x) => x.id === link.id);
        if (!node) continue;
        operations.push({
          op: 'set',
          id: node.id,
          text:
            node.type === 'text'
              ? this.boardLibrary.relinkText(
                  node.text,
                  isSub(here),
                  (linkText) => linkText,
                )
              : label,
        });
        operations.push({
          op: 'edge',
          edge: {
            id: [...Array(16)]
              .map(() => Math.floor(Math.random() * 16).toString(16))
              .join(''),
            fromNode: node.id,
            fromSide: fromSide,
            toNode: operations.group,
            toSide: toSide,
          },
        });
      }
    }
    this.edit(canvas, operations);
    if (mode === 'group') {
      const toLink = (alias) => `[[${here}|${alias}]]`;
      for (const filePath of [
        ...new Set(
          links.filter((link) => link.path !== here).map((link) => link.path),
        ),
      ]) {
        const linkingFile = this.app.vault.getAbstractFileByPath(filePath);
        if (!linkingFile) continue;
        if (filePath.endsWith('.canvas')) {
          const relink = (canvasData) => {
            for (const node of canvasData.nodes || []) {
              if (node.type === 'file' && node.file === file.path) {
                node.file = here;
              } else if (node.type === 'text') {
                node.text = this.boardLibrary.relinkText(
                  node.text,
                  isSub(filePath),
                  toLink,
                );
              }
            }
          };
          const open = this.openCanvas(filePath);
          if (open) {
            const canvasData = open.getData();
            relink(canvasData);
            open.setData(canvasData);
            open.requestSave();
          } else {
            await this.app.vault.process(linkingFile, (content) => {
              const canvasData = JSON.parse(content || '{}');
              relink(canvasData);
              return JSON.stringify(canvasData, null, '\t');
            });
          }
        } else {
          await this.app.vault.process(linkingFile, (content) =>
            this.boardLibrary.relinkText(content, isSub(filePath), toLink),
          );
        }
      }
    }
    if (mode !== 'copy') await this.app.fileManager.trashFile(file);
    const cardCount = (sub.nodes || []).length,
      linkCount = links.length,
      plural = (x) => (x > 1 ? 's' : '');
    const what = {
      dissolve:
        `unpacked ${cardCount} card${plural(cardCount)}, ${file.path} trashed` +
        (linkCount
          ? ` (${linkCount} link${plural(linkCount)} now broken)`
          : ''),
      copy: `unpacked ${cardCount} card${plural(cardCount)}, ${file.path} kept`,
      group: `unpacked ${cardCount} card${plural(cardCount)} into a group, ${linkCount} link${plural(linkCount)} redirected`,
    }[mode];
    this.undoNotice(
      canvas,
      what,
      [],
      mode === 'copy' ? null : { path: file.path, content },
    );
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

  // Context of the note a card links (its `context:` list), so its archive note keeps the same context.
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

  // True if the board, or a plan canvas linked from one of its cards, has a card in `go` (setting "Workflow").
  async hasGoCards(board, goColorSet) {
    const read = async (filePath) => {
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (!file) return [];
      try {
        return JSON.parse(await this.app.vault.cachedRead(file)).nodes || [];
      } catch (error) {
        return [];
      }
    };
    const isGo = (node) => goColorSet.has(node.color);
    const open = this.openCanvas(board);
    const nodes = open ? open.getData().nodes : await read(board);
    if (nodes.some(isGo)) return true;
    for (const node of nodes) {
      for (const match of (node.text || '').matchAll(
        /\[\[([^\]|#]+\.canvas)/g,
      )) {
        const dest = this.app.metadataCache.getFirstLinkpathDest(
          match[1].trim(),
          board,
        );
        if (dest && (await read(dest.path)).some(isGo)) return true;
      }
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
    if (!goColorSet.size) {
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
      return;
    }
    if (!(await this.hasGoCards(board, goColorSet))) {
      const names = Object.keys(COLOR_NUM).filter((colorName) =>
        goColorSet.has(COLOR_NUM[colorName]),
      );
      new Notice(
        `Kanvas board: nothing to do on ${board} (no ${names.join(' or ')} card)`,
      );
      return;
    }
    const vars = { vault, board, claude };
    const template = String(this.settings.terminal || '').trim();
    const launch = template
      ? (([command, ...commandArguments]) => [command, commandArguments])(
          (template.match(/"[^"]*"|\S+/g) || []).map((argument) =>
            argument
              .replace(/^"|"$/g, '')
              .replace(
                /\{(vault|board|claude)\}/g,
                (match, name) => vars[name],
              ),
          ),
        )
      : defaultLaunch(vars);
    if (!launch) {
      new Notice(
        'Kanvas board: no terminal found to start the pass. Set "Terminal command" in the plugin settings.',
        10000,
      );
      return;
    }
    const [cmd, cmdArgs] = launch;
    try {
      const child = spawn(cmd, cmdArgs, {
        cwd: vault,
        detached: true,
        stdio: 'ignore',
      });
      child.on(
        'error',
        (error) =>
          new Notice(
            `Kanvas board: could not start the pass (${error.message})`,
          ),
      );
      child.unref();
      new Notice(`Kanvas board: pass started on ${board}`);
    } catch (error) {
      new Notice(`Kanvas board: could not start the pass (${error.message})`);
    }
  }
}

module.exports = CanvasBoardPlugin;
