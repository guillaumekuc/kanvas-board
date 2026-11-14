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
const fs = require('fs');
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
    const dir = path.join(this.app.vault.adapter.basePath, this.manifest.dir);
    const cb = boardLibrary;
    const { applyOps, layoutOps } = cb;
    this.cb = cb;
    let legacyApm;
    if (!this.settings.apm) {
      try {
        legacyApm = JSON.parse(
          fs.readFileSync(
            path.join(dir, '..', 'apm-counter', 'data.json'),
            'utf8',
          ),
        );
      } catch (e) {
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
      apply: async (board, ops) => {
        const canvas = this.openCanvas(board);
        if (!canvas) return null;
        const d = canvas.getData();
        const retyped = applyOps(d, ops);
        if (retyped.length) {
canvas.setData({
            ...d,
            nodes: d.nodes.filter((n) => !retyped.includes(n.id)),
          });
}
        canvas.setData(d);
        canvas.requestSave();
        await new Promise((r) => setTimeout(r, 2500));
        return 'obsidian';
      },
    };
    this.syncSkill(dir);
    this.addCommand({
      id: 'reset-skill',
      name: "Reset agent skill to the plugin's version (overwrites your edits)",
      callback: () => this.syncSkill(dir, true),
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
          const ids = [...canvas.selection].map((n) => n.id);
          const d = canvas.getData();
          this.edit(
            canvas,
            layoutOps(d, {
              ids,
              dir: this.settings.layoutDirection,
              dagre,
              flow: this.settings.foldDirection,
            }),
            d,
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
    for (const [dir, { name }] of Object.entries(LAYOUT_DIRS)) {
this.addCommand({
        id: `tidy-direction-${dir.toLowerCase()}`,
        name: `Tidy layout direction: ${name}`,
        checkCallback: (checking) => {
          if (this.settings.layoutDirection === dir) return false;
          if (!checking) this.setLayoutDirection(dir);
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
        (e) => new Notice(`Kanvas board: ${e.message}`),
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
    const isText = (n) => n.getData().type === 'text';

    // Pack / unpack (ids stay collapse / expand so hotkeys keep working). Pack moves cards into a new subcanvas.
    canvasCommand(
      'collapse',
      'Pack into subcanvas',
      ['Pack into subcanvas', 'package'],
      (c, sel) => sel.length > 0,
      (canvas, sel) =>
        new NamePrompt(this.app, 'Subcanvas name', async (name) => {
          const board = this.activeFile();
          const dir =
            board.parent && board.parent.path !== '/'
              ? board.parent.path + '/'
              : '';
          const file = this.freePath(dir, name, '.canvas');
          const { ops, sub } = cb.collapseOps(
            canvas.getData(),
            sel.map((n) => n.id),
            file,
            name,
          );
          await this.app.vault.create(file, JSON.stringify(sub, null, '\t'));
          this.edit(canvas, ops);
          this.undoNotice(
            canvas,
            `packed ${sel.length} card${sel.length > 1 ? 's' : ''} into ${file}`,
            [file],
          );
        }).open(),
    );

    // Unpack (dissolve) = cut and paste: the cards come out, the file goes to the trash. Other links to the file
    // (cards on any canvas, notes) would break: then a choice. Unpack (copy) = copy and paste: the file stays.
    const linked = (c, sel) => sel.length === 1 && !!this.linkedCanvas(sel[0]);
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
            (e) => new Notice(`Kanvas board: ${e.message}`),
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
      (c, sel) => sel.length > 1 && sel.every(isText),
      (canvas, sel) =>
        this.edit(
          canvas,
          cb.mergeOps(
            canvas.getData(),
            sel.map((n) => n.id),
          ),
        ),
    );

    // Only the top-level split is a menu item; the others stay commands.
    for (const [by, label] of [
      ['paragraph', 'paragraph'],
      ['bullet', 'top-level bullet'],
      ['h1', 'heading 1'],
      ['h2', 'heading 2'],
      ['h3', 'heading 3'],
    ]) {
canvasCommand(
        `split-${by}`,
        `Split card by ${label}`,
        by === 'bullet' ? ['Split by top-level bullet', 'split'] : null,
        (c, sel) => sel.length === 1 && isText(sel[0]) && !sel[0].isEditing,
        (canvas, [node]) =>
          this.edit(canvas, cb.splitOps(canvas.getData(), node.id, by)),
      );
}

    // The card being edited, with text selected: the selection becomes a new card.
    canvasCommand(
      'extract',
      'Extract current selection to a new card',
      ['Extract current selection to a new card', 'text-select'],
      (c, sel) =>
        sel.length === 1 && sel[0].isEditing && !!this.cardEditor(sel[0]),
      (canvas, [node]) => {
        const editor = this.cardEditor(node);
        const part = editor.getSelection();
        if (!part.trim()) throw new Error('select some text in the card first');
        const from = editor.posToOffset(editor.getCursor('from'));
        const before = editor.getValue();
        editor.replaceSelection('');
        node.blur();
        const d = canvas.getData();
        const n = d.nodes.find((x) => x.id === node.id);
        if (n) n.text = before; // the editor may not have saved yet: work from what it showed
        this.edit(canvas, cb.extractOps(d, node.id, part, from), d);
      },
    );

    canvasCommand(
      'archive',
      'Archive selected cards',
      ['Archive', 'archive'],
      (c, sel) => sel.length > 0,
      async (canvas, sel) => {
        const board = this.activeFile().path;
        const d = canvas.getData();
        const dir = cb.archiveDir(board, this.settings);
        if (!this.app.vault.getAbstractFileByPath(dir)) {await this.app.vault.createFolder(dir);}
        const notes = [];
        for (const node of sel) {
          const a = cb.archiveNote(
            d,
            node.id,
            board,
            window.moment().format('YYYY-MM-DD'),
            this.cardContexts(node, board),
          );
          notes.push(this.freePath(dir + '/', a.name, '.md'));
          await this.app.vault.create(notes[notes.length - 1], a.content);
        }
        this.edit(
          canvas,
          sel.map((n) => ({ op: 'remove', id: n.id })),
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
    const canFold = (c, n) =>
      !this.foldOf(n) &&
      this.branchLinks(c, this.settings.foldDirection).has(n.id);
    canvasCommand(
      'fold',
      'Fold branch',
      ['Fold branch', 'chevrons-down-up'],
      (c, sel) => sel.some((n) => canFold(c, n)),
      (canvas, sel) =>
        this.setFolds(
          canvas,
          new Map(
            sel
              .filter((n) => canFold(canvas, n))
              .map((n) => [n.id, this.settings.foldDirection]),
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
        (c, sel) => sel.some((n) => this.unfoldTargets(c, n.id).length),
        (canvas, sel) =>
          this.unfold(
            canvas,
            [...new Set(sel.flatMap((n) => this.unfoldTargets(canvas, n.id)))],
            levels,
          ),
      );
}
    for (const [dir, label] of [
      ['out', 'outgoing (cards it points to)'],
      ['in', 'incoming (cards pointing to it)'],
    ]) {
this.addCommand({
        id: `fold-direction-${dir}`,
        name: `Fold direction: ${label}`,
        checkCallback: (checking) => {
          if (this.settings.foldDirection === dir) return false;
          if (!checking) {
            this.settings.foldDirection = dir;
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
          (f) =>
            f.extension === 'canvas' &&
            f.path.startsWith(cb.TEMPLATE_DIR + '/'),
        );
    const templateName = (f) =>
      f.path.slice(cb.TEMPLATE_DIR.length + 1, -'.canvas'.length); // subfolders kept
    canvasCommand(
      'template-save',
      'Save selected cards as a template',
      ['Save as template', 'layout-template'],
      (c, sel) => sel.length > 0,
      (canvas) => {
        const existing = new Map(
          templates().map((f) => [templateName(f).toLowerCase(), f]),
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
            if (!this.app.vault.getAbstractFileByPath(cb.TEMPLATE_DIR)) {await this.app.vault.createFolder(cb.TEMPLATE_DIR);}
            const file = this.freePath(cb.TEMPLATE_DIR + '/', name, '.canvas');
            await this.app.vault.create(file, content);
            new Notice(`Kanvas board: template saved to ${file}`);
          },
          {
            suggestions: [...existing.values()].map(templateName),
            overwrite: (v) => existing.has(v.toLowerCase()),
          },
        ).open();
      },
    );
    // Selection tools: the selection grows to related cards (visible ones only: hidden cards never stay selected).
    // Children: every level down, in the fold direction. The selected cards stay selected.
    const cards = (sel) =>
      sel.filter((n) => !n.from && n.getData().type !== 'group');
    const selectMore = (this.selectMore = (canvas, sel, keep) => {
      const add = [...canvas.nodes.values()].filter(
        (n) =>
          n.getData().type !== 'group' && !this.isHidden(canvas, n) && keep(n),
      );
      canvas.updateSelection(() => {
        canvas.selection.clear();
        for (const n of [...sel, ...add]) canvas.selection.add(n);
      });
      return add.length;
    });
    const childIds = (c, sel) =>
      new Set(
        cards(sel).flatMap((n) =>
          this.branchLevels(c, n.id, this.settings.foldDirection).flat(),
        ),
      );
    canvasCommand(
      'select-children',
      'Select children (all levels down, in the fold direction)',
      ['Select children', 'list-tree'],
      (c, sel) =>
        [...childIds(c, sel)].some(
          (id) =>
            c.nodes.get(id) &&
            !this.isHidden(c, c.nodes.get(id)) &&
            !c.selection.has(c.nodes.get(id)),
        ),
      (canvas, sel) => {
        const ids = childIds(canvas, sel);
        selectMore(canvas, sel, (n) => ids.has(n.id));
      },
    );
    const tagsOf = (sel) =>
      new Set(cards(sel).flatMap((n) => [...this.cardTagSet(n)]));
    canvasCommand(
      'select-same-tag',
      'Select cards with the same tag',
      ['Select same tag', 'tag'],
      (c, sel) => tagsOf(sel).size > 0,
      (canvas, sel) => {
        const tags = tagsOf(sel);
        selectMore(canvas, sel, (n) =>
          [...this.cardTagSet(n)].some((t) => tags.has(t)),
        );
      },
    );
    canvasCommand(
      'select-same-color',
      'Select cards with the same color',
      ['Select same color', 'palette'],
      (c, sel) => cards(sel).length > 0,
      (canvas, sel) => {
        const colors = new Set(cards(sel).map((n) => n.getData().color || ''));
        selectMore(canvas, sel, (n) => colors.has(n.getData().color || ''));
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
              (f) =>
                f.extension === 'canvas' &&
                f.path.startsWith(cb.TEMPLATE_DIR + '/'),
            );
          if (!files.length) {
new Notice(
              `Kanvas board: no template in ${cb.TEMPLATE_DIR} (Save selected cards as a template)`,
            );
} else {
new Picker(
              this.app,
              'Template',
              files,
              (f) => f.basename,
              (f) => this.insertTemplate(canvas, f),
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
          let f = this.finds.get(canvas);
          if (!f) {
            f = new FindBar(this, canvas);
            this.finds.set(canvas, f);
          }
          f.open();
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
      for (const a of actions) {
if (a.menu && a.test(canvas, sel)) {
menu.addItem((item) =>
            item
              .setTitle(this.keyedTitle(a.menu[0], a.id))
              .setIcon(a.menu[1])
              .setSection('canvas-board')
              .onClick(() => runAction(a.run, canvas, sel)),
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
            (n) => n.isEditing && this.cardEditor(n) === editor,
          );
        if (node) addActions(menu, canvas, [node]);
      }),
    );

    const isArchived = (file) => {
      const fm =
        file &&
        file.extension === 'md' &&
        (this.app.metadataCache.getFileCache(file) || {}).frontmatter;
      return !!(fm && fm['archived-from']);
    };
    this.addCommand({
      id: 'restore',
      name: 'Restore archived card (from its archive note)',
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!isArchived(file)) return false;
        if (!checking) {
this.restore(file).catch(
            (e) => new Notice(`Kanvas board: ${e.message}`),
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
                  (e) => new Notice(`Kanvas board: ${e.message}`),
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
      const c = this.activeCanvas();
      if (c) this.pane(c).toggle(true);
    });
    const tick = () => {
      this.updateCount();
      // Cards that come into view or are added get the classes again. Every open canvas has its filter pane.
      const open = new Set();
      for (const l of this.app.workspace.getLeavesOfType('canvas')) {
        const canvas = l.view.canvas;
        if (!canvas || !canvas.wrapperEl) continue;
        open.add(canvas);
        this.decorate(l.view);
        this.refreshView(canvas); // folds come with the file: every canvas
        this.pane(canvas).update();
      }
      for (const [canvas, pane] of this.panes) {
if (!open.has(canvas)) {
          pane.destroy();
          this.panes.delete(canvas);
        }
}
      for (const [canvas, f] of this.finds) {
if (!open.has(canvas)) {
          f.destroy();
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
      for (const f of this.finds.values()) f.destroy();
      this.finds.clear();
      for (const l of this.app.workspace.getLeavesOfType('canvas')) {
        const canvas = l.view.canvas;
        this.undecorate(l.view);
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
      COLORS.find((c) => c[0] === name)[3]
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
    const row = COLORS.find((c) => c[0] === name);
    const cmd =
      this.app.commands &&
      this.app.commands.commands[`${this.manifest.id}:color-${row[2]}`];
    if (cmd) cmd.name = `${this.manifest.name}: ${this.colorCommandName(name)}`;
    for (const canvas of this.panes.keys()) this.refreshView(canvas);
  }

  // Hotkey of a plugin command as Obsidian prints it ("Alt + ↑"), or ''.
  hotkey(id) {
    const hm = this.app.hotkeyManager;
    try {
      return (
        (hm &&
          hm.printHotkeyForCommand &&
          hm.printHotkeyForCommand(`${this.manifest.id}:${id}`)) ||
        ''
      );
    } catch (e) {
      return '';
    }
  }

  // Tooltip with its key, the way the canvas's own buttons show it ("Zoom to selection\n(Shift + 2)").
  keyedLabel(label, id) {
    const k = this.hotkey(id);
    return k ? `${label}\n(${k})` : label;
  }

  // Menu item title with its key, muted, after the label.
  keyedTitle(label, id) {
    const k = this.hotkey(id);
    if (!k) return label;
    return createFragment((f) => {
      f.appendText(label);
      f.createSpan({ cls: 'canvas-board-key', text: k });
    });
  }

  // A notice with an Undo button: one canvas undo step and the files the action made go to the trash. Only while
  // the board has not changed since (else the undo would take back something else).
  // `restore` ({ path, content }) brings a trashed file back on undo (unpack). Redirected links are not undone.
  undoNotice(canvas, msg, files = [], restore = null) {
    const h = canvas.history;
    const at = h ? h.current : null;
    const frag = createFragment((f) => {
      f.appendText(`Kanvas board: ${msg} `);
      const b = f.createEl('button', {
        cls: 'canvas-board-notice-undo',
        text: 'Undo',
      });
      b.addEventListener('click', async () => {
        if (!h || h.current !== at) {
          new Notice('Kanvas board: the board changed since, use Ctrl+Z');
          return;
        }
        canvas.undo();
        for (const p of files) {
          const file = this.app.vault.getAbstractFileByPath(p);
          if (file) await this.app.fileManager.trashFile(file);
        }
        if (restore && !this.app.vault.getAbstractFileByPath(restore.path)) {await this.app.vault.create(restore.path, restore.content);}
      });
    });
    new Notice(frag, 8000);
  }

  async openBoard() {
    const board = this.settings.defaultBoard;
    const leaf = this.app.workspace
      .getLeavesOfType('canvas')
      .find((l) => l.view.file && l.view.file.path === board);
    if (leaf) {
      this.app.workspace.setActiveLeaf(leaf, { focus: true });
      return;
    }
    const file = this.app.vault.getAbstractFileByPath(board);
    if (!file) {
      new Notice(
        createFragment((f) => {
          f.appendText(
            `Kanvas board: ${board} not found (setting "Default board"). `,
          );
          const b = f.createEl('button', {
            cls: 'canvas-board-notice-undo',
            text: 'Create a starter board',
          });
          b.addEventListener('click', () => this.createStarterBoard());
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
      const dir =
        path.posix.dirname(board) === '.'
          ? ''
          : `${path.posix.dirname(board)}/`;
      let n = 1;
      do board = `${dir}Starter board${n > 1 ? ` ${n}` : ''}.canvas`;
      while (vault.getAbstractFileByPath(board) && ++n);
    }
    const id = () =>
      Array.from({ length: 16 }, () =>
        Math.floor(Math.random() * 16).toString(16),
      ).join('');
    const nodes = [];
    const edges = [];
    const W = 400;
    nodes.push({
      id: id(),
      type: 'group',
      label: 'How the colors work',
      x: -40,
      y: -80,
      width: W + 80,
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
    WORKFLOW.forEach(([name, meaning], i) => {
      nodes.push({
        id: id(),
        type: 'text',
        text: `${DOT[name]} **${this.colorLabel(name)}** (${COLOR_NUM[name] ? name : 'uncolored'})\n${meaning}`,
        x: 0,
        y: i * 100,
        width: W,
        height: 80,
      });
    });
    const steps = [
      '**1. Write a wish**\nOne card, one thing you want done, in your own words. Uncolored cards are ideas: the agent never touches them.',
      '**2. Color it**\nCyan: the agent carries it to done. Purple: one step (a brief, then a plan), then it hands back. Color hotkeys: Settings > Kanvas board > Hotkeys.',
      '**3. Run a pass**\nCommand "Kanvas board: Run pass". A terminal opens with the agent on this board; it turns the cards it takes orange.',
      "**4. Answer**\nYellow: a question or a review for you, in the card's note. Answer there, color the card cyan or purple again, run the next pass.",
    ];
    const x0 = W + 160;
    nodes.push({
      id: id(),
      type: 'group',
      label: 'First steps',
      x: x0 - 40,
      y: -80,
      width: W + 80,
      height: steps.length * 160 + 280,
    });
    let prev;
    steps.forEach((text, i) => {
      const card = {
        id: id(),
        type: 'text',
        text,
        x: x0,
        y: i * 160,
        width: W,
        height: 130,
      };
      nodes.push(card);
      if (prev) {
edges.push({
          id: id(),
          fromNode: prev,
          fromSide: 'bottom',
          toNode: card.id,
          toSide: 'top',
        });
}
      prev = card.id;
    });
    nodes.push({
      id: id(),
      type: 'text',
      text: 'Try it: color this card cyan, then run a pass.\n\nWrite a short note that explains this board in my own words.',
      x: x0,
      y: steps.length * 160 + 20,
      width: W,
      height: 130,
    });
    try {
      const dir = path.posix.dirname(board);
      if (dir !== '.' && !vault.getAbstractFileByPath(dir)) {await vault.createFolder(dir);}
      const file = await vault.create(
        board,
        JSON.stringify({ nodes, edges }, null, '\t'),
      );
      await this.app.workspace.getLeaf(false).openFile(file);
      new Notice(`Kanvas board: starter board created (${board})`);
    } catch (e) {
      new Notice(
        `Kanvas board: could not create the starter board (${e.message})`,
      );
    }
  }

  async setLayoutDirection(dir) {
    this.settings.layoutDirection = dir;
    await this.saveData(this.settings);
    for (const leaf of this.app.workspace.getLeavesOfType('canvas')) {this.decorate(leaf.view);}
    new Notice(`Kanvas board: tidy layout ${LAYOUT_DIRS[dir].name}`);
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
      .find((l) => l.view === view);
    if (leaf && this.app.workspace.activeLeaf !== leaf) {this.app.workspace.setActiveLeaf(leaf, { focus: true });}
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
          const b = group.createDiv({
            cls: 'canvas-control-item',
            attr: {
              'data-command': id,
              'data-label': label,
              'data-tooltip-position': 'left',
            },
          });
          setIcon(b, icon);
          b.addEventListener('click', (e) => {
            if (id === 'tidy-layout' && e.shiftKey) this.cycleLayoutDirection();
            else this.runOn(view, id);
          });
        }
      }
      for (const b of group.children) {
b.setAttr(
          'aria-label',
          this.keyedLabel(b.dataset.label, b.dataset.command),
        );
}
      // The tidy icon points the way the layout flows; its tooltip says so and how to change it.
      const tidy = group.querySelector('[data-command="tidy-layout"]');
      const dir = LAYOUT_DIRS[this.settings.layoutDirection] || LAYOUT_DIRS.TB;
      if (tidy) {
        this.tidyTurn = nextTurn(this.tidyTurn ?? dir.turn, dir.turn);
        tidy.style.setProperty(
          '--canvas-board-tidy-turn',
          `${this.tidyTurn}deg`,
        );
        tidy.setAttr(
          'aria-label',
          this.keyedLabel(
            `Tidy layout: ${dir.name}\nShift-click: next direction`,
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
      menu.render = function (...a) {
        const r = orig.apply(this, a);
        try {
          plugin.menuButtons(canvas);
        } catch (e) {
          console.error('canvas-board: selection toolbar', e);
        }
        return r;
      };
      // The color picker opens on click: its swatches get the state as tooltip.
      menu.canvasBoardObserver = new MutationObserver(() => {
        for (const item of menu.menuEl.querySelectorAll(
          '.canvas-color-picker-item:not(.canvas-color-picker-custom)',
        )) {
          const c =
            (item.className.match(/mod-canvas-color-(\d)/) || [])[1] || '';
          const row = COLORS.find((x) => x[1] === c);
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
    const el = canvas.menu.menuEl;
    const sel = [...canvas.selection];
    if (
      !sel.length ||
      !el.childElementCount ||
      el.querySelector('.canvas-board-menu-btn')
    ) {return;}
    for (const id of ['fold', 'unfold', 'archive']) {
      const a = this.actions.find((x) => x.id === id);
      if (!a || !a.test(canvas, sel)) continue;
      const b = el.createEl('button', {
        cls: 'clickable-icon canvas-board-menu-btn',
        attr: {
          'aria-label': this.keyedLabel(a.menu[0], id),
          'data-tooltip-position': 'top',
        },
      });
      setIcon(b, a.menu[1]);
      b.addEventListener('click', () =>
        this.runAction(a.run, canvas, [...canvas.selection]),
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
for (const el of canvas.wrapperEl.querySelectorAll(
        '.canvas-board-controls, .canvas-board-menu-btn',
      )) {el.remove();}
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
    let v = this.views.get(canvas);
    if (v || !create) return v || empty();
    v = empty();
    this.views.set(canvas, v);
    // Hidden cards never stay selected (select all, drag to select), so Delete never hits a card you can't see.
    const plugin = this;
    const orig = canvas.updateSelection;
    canvas.updateSelection = function (fn) {
      const r = orig.call(this, () => {
        fn();
        for (const x of [...this.selection]) {
if (
            v.hidden.has(x.id) ||
            (x.from &&
              (v.hidden.has(x.from.node.id) || v.hidden.has(x.to.node.id)))
          ) {this.selection.delete(x);}
}
      });
      plugin.updateCount(); // selected count in the status bar follows at once
      return r;
    };
    // Undo / redo may bring folds back or take them away: redraw at once.
    const history = canvas.applyHistory;
    if (history) {
canvas.applyHistory = function (...a) {
        const r = history.apply(this, a);
        plugin.refreshView(this);
        return r;
      };
}
    return v;
  }

  isHidden(canvas, node) {
    return this.viewState(canvas, false).hidden.has(node.id);
  }

  // Clears the filter and unfolds every card (one undo step for the folds).
  showAll(canvas) {
    const v = this.viewState(canvas, false);
    v.xcolors.clear();
    v.xtags.clear();
    const folds = this.folds(canvas);
    if (folds.size) {this.setFolds(canvas, new Map([...folds.keys()].map((id) => [id, null])));} else this.refreshView(canvas);
  }

  // A fold is stored on the card as "canvasBoard": {"folded": "in" | "out"} (the fold direction). JSON Canvas
  // 1.0 has no such field; other readers ignore it and show every card. Obsidian keeps it (node.unknownData).
  foldOf(node) {
    const cb = node.getData().canvasBoard;
    return (cb && cb.folded) || null;
  }

  folds(canvas) {
    const m = new Map();
    for (const n of canvas.nodes.values()) {
      const dir = this.foldOf(n);
      if (dir) m.set(n.id, dir);
    }
    return m;
  }

  // `changes`: card id → direction to fold, or null to unfold. One canvas edit, one undo step.
  setFolds(canvas, changes) {
    if (!changes.size) return;
    const d = canvas.getData();
    for (const n of d.nodes) {
      if (!changes.has(n.id)) continue;
      const cb = { ...(n.canvasBoard || {}) };
      const dir = changes.get(n.id);
      if (dir) cb.folded = dir;
      else delete cb.folded;
      if (Object.keys(cb).length) n.canvasBoard = cb;
      else delete n.canvasBoard;
    }
    this.edit(canvas, [], d);
    this.refreshView(canvas);
  }

  pane(canvas) {
    let p = this.panes.get(canvas);
    if (!p) {
      p = new FilterPane(this, canvas);
      this.panes.set(canvas, p);
    }
    return p;
  }

  // Card id → ids one edge away, following edges out (from → to) or in (to → from).
  branchLinks(canvas, dir) {
    const links = new Map();
    for (const e of canvas.edges.values()) {
      const [a, b] =
        dir === 'in'
          ? [e.to.node.id, e.from.node.id]
          : [e.from.node.id, e.to.node.id];
      if (a !== b) links.set(a, (links.get(a) || []).concat(b));
    }
    return links;
  }

  // Ids below a folded card, level by level (level 1 first).
  branchLevels(canvas, root, dir) {
    const links = this.branchLinks(canvas, dir);
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
          const n = canvas.nodes.get(y);
          if (n && this.foldOf(n)) found.push(y);
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
      const dir = node && this.foldOf(node);
      if (!dir) continue;
      changes.set(id, null);
      const below = this.branchLevels(canvas, id, dir);
      const links = this.branchLinks(canvas, dir);
      if (levels < below.length) {
for (const x of below[levels - 1]) {if ((links.get(x) || []).length) changes.set(x, dir);}
}
    }
    this.setFolds(canvas, changes);
  }

  // Tags of a card (no #): the `#tags` in its own text, never those of the notes it links. Exact match only:
  // #tag1 is not #tag10.
  cardTagSet(node) {
    const tags = new Set();
    for (const m of (node.getData().text || '').matchAll(
      /(?:^|\s)#([^\s#.,;:!?()[\]{}"'`]+)/g,
    )) {if (!/^\d+$/.test(m[1])) tags.add(m[1]);}
    return tags;
  }

  // Every color and tag shows by default; a hidden color, or any hidden tag, hides the card.
  matches(node, v) {
    if (v.xcolors.has(node.getData().color || '')) return false;
    if (!v.xtags.size) return true;
    const tags = this.cardTagSet(node);
    return ![...v.xtags].some((t) => tags.has(t));
  }

  filtering(v) {
    return !!(v.xcolors.size || v.xtags.size);
  }

  // Hidden = not matching the filter (groups always show), or below a folded card. With the setting "Hide cards
  // under hidden tags", a card hidden by a tag also hides its branch, as a fold in the fold direction would.
  refreshView(canvas) {
    const v = this.viewState(canvas);
    const hidden = new Set();
    if (this.filtering(v)) {
for (const node of canvas.nodes.values()) {
if (node.getData().type !== 'group' && !this.matches(node, v)) {hidden.add(node.id);}
}
}
    if (v.xtags.size && this.settings.hideTagBranches) {
for (const node of canvas.nodes.values()) {
        const tags = this.cardTagSet(node);
        if (![...v.xtags].some((t) => tags.has(t))) continue;
        for (const id of this.branchLevels(
          canvas,
          node.id,
          this.settings.foldDirection,
        ).flat()) {
if (
            canvas.nodes.get(id) &&
            canvas.nodes.get(id).getData().type !== 'group'
          ) {hidden.add(id);}
}
      }
}
    const folded = new Map();
    for (const [root, dir] of this.folds(canvas)) {
      const below = this.branchLevels(canvas, root, dir).flat();
      folded.set(root, below.length);
      for (const id of below) hidden.add(id);
    }
    v.hidden = hidden;
    this.paint(canvas, hidden, folded);
    if ([...canvas.selection].some((x) => hidden.has(x.id))) {canvas.updateSelection(() => {});}
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
        for (const ev of ['pointerdown', 'mousedown', 'dblclick']) {badge.addEventListener(ev, (e) => e.stopPropagation());}
        badge.addEventListener('click', (e) => {
          e.stopPropagation();
          this.unfold(canvas, [node.id], 1);
        });
      }
      badge.setText(`· ${folded.get(node.id)} folded`);
      badge.setAttr('aria-label', this.keyedLabel('Unfold 1 level', 'unfold'));
    }
    this.paintStale(canvas);
    for (const e of canvas.edges.values()) {
      const off = hidden.has(e.from.node.id) || hidden.has(e.to.node.id);
      for (const el of [
        e.lineGroupEl,
        e.lineEndGroupEl,
        e.labelElement && e.labelElement.wrapperEl,
      ]) {if (el) el.classList.toggle('canvas-board-hidden', off);}
    }
  }

  // Yellow (needs me) cards whose note was not touched for "Stale after" days: a warning badge (the icon of
  // `- [!]`) with the time since the note last changed. Cards without a note have no date: no badge.
  paintStale(canvas) {
    const days = Number(this.settings.staleDays) || 0;
    const board = canvas.view && canvas.view.file ? canvas.view.file.path : '';
    for (const node of canvas.nodes.values()) {
      const d = node.getData();
      let age = -1;
      if (days > 0 && d.color === '3') {
        let file = null;
        if (d.type === 'file') {file = this.app.vault.getAbstractFileByPath(d.file);} else if (d.type === 'text') {
          const m = /\[\[([^\]|#]+)/.exec(d.text || '');
          if (m) {
file = this.app.metadataCache.getFirstLinkpathDest(
              m[1].trim(),
              board,
            );
}
        }
        if (file && file.stat) {age = Math.floor((Date.now() - file.stat.mtime) / 86400000);}
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
    const n = this.viewState(canvas, false).hidden.size;
    return n ? `${n} card${n > 1 ? 's' : ''} hidden` : '';
  }

  updateViewLabel(canvas) {
    const label = canvas ? this.viewLabel(canvas) : '';
    this.viewEl.setText(label);
    this.viewEl.toggle(!!label);
  }

  cardText(node) {
    const d = node.getData();
    return String(
      (d.type === 'text'
        ? d.text
        : d.type === 'file'
          ? d.file
          : d.type === 'link'
            ? d.url
            : d.label) || '',
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
    const b = canvas.getViewportBBox();
    const w = nodes.length
      ? Math.max(...nodes.map((n) => n.x + n.width)) -
        Math.min(...nodes.map((n) => n.x))
      : 0;
    const h = nodes.length
      ? Math.max(...nodes.map((n) => n.y + n.height)) -
        Math.min(...nodes.map((n) => n.y))
      : 0;
    const at = {
      x: Math.round((b.minX + b.maxX - w) / 2),
      y: Math.round((b.minY + b.maxY - h) / 2),
    };
    const ops = this.cb.templateOps(tpl, at);
    this.edit(canvas, ops);
    const added = ops
      .filter((o) => o.op === 'add')
      .map((o) => canvas.nodes.get(o.node.id))
      .filter(Boolean);
    canvas.updateSelection(() => {
      canvas.selection.clear();
      for (const n of added) canvas.selection.add(n);
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
      .map((n) => n.getData())
      .filter((n) => n.type !== 'group');
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
    for (const n of cards) {
      const c = names[n.color || ''] || 'custom';
      byColor[c] = (byColor[c] || 0) + 1;
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
          .map(([c, k]) => `${c} ${k}`)
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

  syncSkill(dir, force = false) {
    const src = path.join(dir, 'skill', 'SKILL.md');
    const dest = this.skillPath();
    try {
      if (!force && fs.existsSync(dest)) return;
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      if (force) {new Notice("Kanvas board: agent skill reset to the plugin's version");}
    } catch (e) {
      console.error('canvas-board: skill sync failed', e);
      if (force) new Notice(`Kanvas board: skill reset failed (${e.message})`);
    }
  }

  // One undo step: the state before is pushed (unless the history already ends with it), then the edited data
  // is set, which pushes it, so Ctrl+Z and Ctrl+Y each take one step. `d` is passed when the caller already changed it (extract).
  edit(canvas, ops, d = canvas.getData()) {
    const before = canvas.getData();
    const retyped = this.cb.applyOps(d, ops);
    const h = canvas.history;
    const last = h && h.data && h.data[h.current];
    const same = (x) =>
      JSON.stringify(x, (k, v) =>
        v && typeof v === 'object' && !Array.isArray(v)
          ? Object.fromEntries(Object.entries(v).sort())
          : v,
      ); // key order aside
    if (canvas.pushHistory && (!last || same(last) !== same(before))) {canvas.pushHistory(before);}
    if (retyped.length) {
canvas.setData({
        ...d,
        nodes: d.nodes.filter((n) => !retyped.includes(n.id)),
      });
}
    canvas.setData(d); // pushes the new state
    canvas.requestSave(false); // without false it pushes it again a moment later: one more Ctrl+Z needed
  }

  activeFile() {
    const view =
      this.app.workspace.activeLeaf && this.app.workspace.activeLeaf.view;
    return view && view.file;
  }

  freePath(dir, name, ext) {
    for (let k = 1; ; k++) {
      const p = `${dir}${name}${k > 1 ? ' ' + k : ''}${ext}`;
      if (!this.app.vault.getAbstractFileByPath(p)) return p;
    }
  }

  // Cards (on any canvas) and notes that link `file`, except card `skipId` on `canvas`: [{ path, id?, label }].
  async subcanvasLinks(file, canvas, skipId) {
    const out = [];
    const here = this.canvasFile(canvas);
    const hits = (from) => (target) => {
      const f = this.app.metadataCache.getFirstLinkpathDest(target, from);
      return !!f && f.path === file.path;
    };
    for (const f of this.app.vault
      .getFiles()
      .filter((f) => f.extension === 'canvas' && f.path !== file.path)) {
      const open = f.path === here ? canvas : this.openCanvas(f.path);
      let d;
      try {
        d = open
          ? open.getData()
          : JSON.parse((await this.app.vault.cachedRead(f)) || '{}');
      } catch (e) {
        continue;
      }
      for (const n of d.nodes || []) {
        if (f.path === here && n.id === skipId) continue;
        const hit =
          n.type === 'file'
            ? n.file === file.path
            : n.type === 'text' &&
              this.cb.relinkText(n.text, hits(f.path), () => '\u0000') !==
                n.text;
        if (hit) {
out.push({
            path: f.path,
            id: n.id,
            label: (n.text || n.file || '').split('\n')[0],
          });
}
      }
    }
    const resolved = this.app.metadataCache.resolvedLinks;
    for (const src in resolved) {
if (
        src !== file.path &&
        !src.endsWith('.canvas') &&
        resolved[src][file.path]
      ) {out.push({ path: src, label: src });}
}
    return out;
  }

  canvasFile(canvas) {
    const leaf = this.app.workspace
      .getLeavesOfType('canvas')
      .find((l) => l.view.canvas === canvas);
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
    const ops = this.cb.expandOps(
      canvas.getData(),
      node.id,
      { nodes: sub.nodes || [], edges: sub.edges || [] },
      mode === 'group' ? { group: label } : {},
    );
    const here = this.canvasFile(canvas);
    const isSub = (from) => (target) => {
      const f = this.app.metadataCache.getFirstLinkpathDest(target, from);
      return !!f && f.path === file.path;
    };
    if (mode === 'group') {
      const [a, b] =
        this.cb.SIDES[this.settings.layoutDirection] || this.cb.SIDES.TB;
      for (const l of links.filter((l) => l.path === here)) {
        const n = canvas.getData().nodes.find((x) => x.id === l.id);
        if (!n) continue;
        ops.push({
          op: 'set',
          id: n.id,
          text:
            n.type === 'text'
              ? this.cb.relinkText(n.text, isSub(here), (t) => t)
              : label,
        });
        ops.push({
          op: 'edge',
          edge: {
            id: [...Array(16)]
              .map(() => Math.floor(Math.random() * 16).toString(16))
              .join(''),
            fromNode: n.id,
            fromSide: a,
            toNode: ops.group,
            toSide: b,
          },
        });
      }
    }
    this.edit(canvas, ops);
    if (mode === 'group') {
      const to = (t) => `[[${here}|${t}]]`;
      for (const p of [
        ...new Set(links.filter((l) => l.path !== here).map((l) => l.path)),
      ]) {
        const f = this.app.vault.getAbstractFileByPath(p);
        if (!f) continue;
        if (p.endsWith('.canvas')) {
          const relink = (d) => {
            for (const n of d.nodes || []) {
              if (n.type === 'file' && n.file === file.path) n.file = here;
              else if (n.type === 'text') {n.text = this.cb.relinkText(n.text, isSub(p), to);}
            }
          };
          const open = this.openCanvas(p);
          if (open) {
            const d = open.getData();
            relink(d);
            open.setData(d);
            open.requestSave();
          } else {
await this.app.vault.process(f, (t) => {
              const d = JSON.parse(t || '{}');
              relink(d);
              return JSON.stringify(d, null, '\t');
            });
}
        } else {
await this.app.vault.process(f, (t) =>
            this.cb.relinkText(t, isSub(p), to),
          );
}
      }
    }
    if (mode !== 'copy') await this.app.fileManager.trashFile(file);
    const n = (sub.nodes || []).length,
      k = links.length,
      s = (x) => (x > 1 ? 's' : '');
    const what = {
      dissolve:
        `unpacked ${n} card${s(n)}, ${file.path} trashed` +
        (k ? ` (${k} link${s(k)} now broken)` : ''),
      copy: `unpacked ${n} card${s(n)}, ${file.path} kept`,
      group: `unpacked ${n} card${s(n)} into a group, ${k} link${s(k)} redirected`,
    }[mode];
    this.undoNotice(
      canvas,
      what,
      [],
      mode === 'copy' ? null : { path: file.path, content },
    );
  }

  linkedCanvas(node) {
    const d = node.getData();
    const target =
      d.type === 'file'
        ? d.file
        : ((d.text || '').match(/\[\[([^\]|#]+\.canvas)/) || [])[1];
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
    const d = node.getData();
    const target =
      d.type === 'file'
        ? d.file
        : ((d.text || '').match(/\[\[([^\]|#]+)/) || [])[1];
    const file =
      target &&
      this.app.metadataCache.getFirstLinkpathDest(target.trim(), board);
    const fm =
      file && (this.app.metadataCache.getFileCache(file) || {}).frontmatter;
    const c = fm && fm.context ? [].concat(fm.context).map(String) : [];
    return c.length ? c : undefined;
  }

  async restore(note) {
    const src = await this.app.vault.read(note);
    const { board } = this.cb.restoreOps({ nodes: [], edges: [] }, src);
    const file =
      this.app.vault.getAbstractFileByPath(board) ||
      this.app.metadataCache.getFirstLinkpathDest(board, note.path);
    if (!file) throw new Error(`board ${board} not found`);
    const canvas = this.openCanvas(file.path);
    if (canvas) {this.edit(canvas, this.cb.restoreOps(canvas.getData(), src).ops);} else {
await this.app.vault.process(file, (text) => {
        const d = JSON.parse(text);
        d.nodes = d.nodes || [];
        d.edges = d.edges || [];
        this.cb.applyOps(d, this.cb.restoreOps(d, src).ops);
        return JSON.stringify(d, null, '\t');
      });
}
    await this.app.fileManager.trashFile(note);
    new Notice(`Kanvas board: card restored on ${file.path}`);
  }

  openCanvas(board) {
    const leaf = this.app.workspace
      .getLeavesOfType('canvas')
      .find((l) => l.view.file && l.view.file.path === board);
    return leaf ? leaf.view.canvas : null;
  }

  activeCanvas() {
    const view =
      this.app.workspace.activeLeaf && this.app.workspace.activeLeaf.view;
    return view && view.getViewType() === 'canvas' ? view.canvas : null;
  }

  // True if the board, or a plan canvas linked from one of its cards, has a card in `go` (setting "Workflow").
  async hasGoCards(board, go) {
    const read = async (p) => {
      const file = this.app.vault.getAbstractFileByPath(p);
      if (!file) return [];
      try {
        return JSON.parse(await this.app.vault.cachedRead(file)).nodes || [];
      } catch (e) {
        return [];
      }
    };
    const isGo = (n) => go.has(n.color);
    const open = this.openCanvas(board);
    const nodes = open ? open.getData().nodes : await read(board);
    if (nodes.some(isGo)) return true;
    for (const n of nodes) {
      for (const m of (n.text || '').matchAll(/\[\[([^\]|#]+\.canvas)/g)) {
        const dest = this.app.metadataCache.getFirstLinkpathDest(
          m[1].trim(),
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
    const go = parseColors(this.settings.passColors);
    if (!go.size) {
      new Notice(
        createFragment((f) => {
          f.appendText(
            'Kanvas board: the agent did not start, no color triggers it. Turn one on in Settings > Workflow. ',
          );
          const b = f.createEl('button', {
            cls: 'canvas-board-notice-undo',
            text: 'Open settings',
          });
          b.addEventListener('click', () => {
            this.app.setting.open();
            this.app.setting.openTabById(this.manifest.id);
          });
        }),
        10000,
      );
      return;
    }
    if (!(await this.hasGoCards(board, go))) {
      const names = Object.keys(COLOR_NUM).filter((k) => go.has(COLOR_NUM[k]));
      new Notice(
        `Kanvas board: nothing to do on ${board} (no ${names.join(' or ')} card)`,
      );
      return;
    }
    const vars = { vault, board, claude };
    const template = String(this.settings.terminal || '').trim();
    const launch = template
      ? (([c, ...a]) => [c, a])(
          (template.match(/"[^"]*"|\S+/g) || []).map((a) =>
            a
              .replace(/^"|"$/g, '')
              .replace(/\{(vault|board|claude)\}/g, (_, k) => vars[k]),
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
        (e) =>
          new Notice(`Kanvas board: could not start the pass (${e.message})`),
      );
      child.unref();
      new Notice(`Kanvas board: pass started on ${board}`);
    } catch (e) {
      new Notice(`Kanvas board: could not start the pass (${e.message})`);
    }
  }
}

module.exports = CanvasBoardPlugin;
