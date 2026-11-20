import { Notice } from 'obsidian';
import dagre from '../../dagre.min.js';
import { layoutOps } from '../board/geometry.js';
import { TEMPLATE_DIR } from '../board/store.js';
import { NamePrompt, Picker, UnpackChoice } from './prompts.js';
import {
  COLORS,
  isArchiveNote,
  templateFiles,
  templateName,
  LAYOUT_DIRS,
} from './shared.js';
import { isTextNode, selectedCards, FindBar } from './view.js';

function registerColorCommands(plugin) {
  for (const [name, color, key] of COLORS) {
    plugin.addCommand({
      id: `color-${key}`,
      name: plugin.colorCommandName(name),
      checkCallback: (checking) => {
        const canvas = plugin.activeCanvas();
        if (!canvas || canvas.selection.size === 0) return false;
        if (!checking) {
          for (const node of canvas.selection) node.setColor(color);
          canvas.requestSave();
        }
        return true;
      },
    });
  }
}

function registerTidyCommands(plugin) {
  // Selected cards only (2+; the rest never moves): never the whole board
  // unasked (Ctrl+A first). Ctrl+Z undoes it.
  plugin.addCommand({
    id: 'tidy-layout',
    name: 'Tidy layout (selected cards)',
    checkCallback: (checking) => {
      const canvas = plugin.activeCanvas();
      if (!canvas) return false;
      if (!checking) {
        if (canvas.selection.size < 2) {
          new Notice(
            'Tidy layout: select the cards to tidy first (2 or more; ' +
              'Ctrl+A for the whole canvas).',
          );
          return true;
        }
        const ids = [...canvas.selection].map((node) => node.id);
        const canvasData = canvas.getData();
        plugin.edit(
          canvas,
          layoutOps(canvasData, {
            ids,
            direction: plugin.settings.layoutDirection,
            dagre,
            flow: plugin.settings.foldDirection,
          }),
          canvasData,
        );
      }
      return true;
    },
  });
  plugin.addCommand({
    id: 'tidy-direction-next',
    name: 'Tidy layout direction: next',
    callback: () => plugin.cycleLayoutDirection(),
  });
  for (const [direction, { name }] of Object.entries(LAYOUT_DIRS)) {
    plugin.addCommand({
      id: `tidy-direction-${direction.toLowerCase()}`,
      name: `Tidy layout direction: ${name}`,
      checkCallback: (checking) => {
        if (plugin.settings.layoutDirection === direction) return false;
        if (!checking) plugin.setLayoutDirection(direction);
        return true;
      },
    });
  }
}

function registerPackCommands(plugin) {
  // Pack / unpack (ids stay collapse / expand so hotkeys keep working). Pack
  // moves cards into a new subcanvas.
  plugin.addCanvasCommand('collapse', 'Pack into subcanvas', {
    menu: ['Pack into subcanvas', 'package'],
    test: (canvas, selection) => selection.length > 0,
    run: (canvas, selection) =>
      new NamePrompt(plugin.app, {
        title: 'Subcanvas name',
        onSubmit: async (name) => {
          const board = plugin.activeFile();
          const folder =
            board.parent && board.parent.path !== '/'
              ? board.parent.path + '/'
              : '';
          const file = plugin.freePath(folder, name, '.canvas');
          const { operations, subcanvas } = plugin.boardLibrary.collapseOps(
            canvas.getData(),
            {
              ids: selection.map((node) => node.id),
              file,
              label: name,
            },
          );
          await plugin.app.vault.create(
            file,
            JSON.stringify(subcanvas, null, '\t'),
          );
          plugin.edit(canvas, operations);
          plugin.undoNotice(
            canvas,
            `packed ${selection.length} ` +
              `card${selection.length > 1 ? 's' : ''} into ${file}`,
            { files: [file] },
          );
        },
      }).open(),
  });
}

function registerUnpackCommands(plugin) {
  // Unpack (dissolve) = cut and paste: the cards come out, the file goes to the
  // trash. Other links to the file (cards on any canvas, notes) would break:
  // then a choice. Unpack (copy) = copy and paste: the file stays.
  function linked(canvas, selection) {
    return selection.length === 1 && !!plugin.linkedCanvas(selection[0]);
  }
  plugin.addCanvasCommand('expand', 'Unpack subcanvas (dissolve)', {
    menu: ['Unpack subcanvas (dissolve)', 'package-open'],
    test: linked,
    run: async (canvas, [node]) => {
      const file = plugin.linkedCanvas(node);
      const links = await plugin.subcanvasLinks(file, canvas, node.id);
      if (!links.length) {
        return plugin.unpack(canvas, node, { file, mode: 'dissolve' });
      }
      new UnpackChoice(plugin.app, file, {
        links,
        onPick: (mode) =>
          plugin
            .unpack(canvas, node, { file, mode, links })
            .catch((error) => new Notice(`Kanvas board: ${error.message}`)),
      }).open();
    },
  });
  plugin.addCanvasCommand('unpack-copy', 'Unpack subcanvas (copy)', {
    menu: ['Unpack subcanvas (copy)', 'copy'],
    test: linked,
    run: (canvas, [node]) =>
      plugin.unpack(canvas, node, {
        file: plugin.linkedCanvas(node),
        mode: 'copy',
      }),
  });
}

function registerMergeSplitCommands(plugin) {
  plugin.addCanvasCommand('merge', 'Merge selected cards', {
    menu: ['Merge cards', 'merge'],
    test: (canvas, selection) =>
      selection.length > 1 && selection.every(isTextNode),
    run: (canvas, selection) =>
      plugin.edit(
        canvas,
        plugin.boardLibrary.mergeOps(
          canvas.getData(),
          selection.map((node) => node.id),
        ),
      ),
  });

  // Only the top-level split is a menu item; the others stay commands.
  for (const [separator, label] of [
    ['paragraph', 'paragraph'],
    ['bullet', 'top-level bullet'],
    ['h1', 'heading 1'],
    ['h2', 'heading 2'],
    ['h3', 'heading 3'],
  ]) {
    plugin.addCanvasCommand(`split-${separator}`, `Split card by ${label}`, {
      menu:
        separator === 'bullet' ? ['Split by top-level bullet', 'split'] : null,
      test: (canvas, selection) =>
        selection.length === 1 &&
        isTextNode(selection[0]) &&
        !selection[0].isEditing,
      run: (canvas, [node]) =>
        plugin.edit(
          canvas,
          plugin.boardLibrary.splitOps(canvas.getData(), node.id, separator),
        ),
    });
  }
}

function registerExtractCommand(plugin) {
  plugin.addCanvasCommand(
    'extract',
    'Extract current selection to a new card',
    {
      menu: ['Extract current selection to a new card', 'text-select'],
      test: (canvas, selection) =>
        selection.length === 1 &&
        selection[0].isEditing &&
        !!plugin.cardEditor(selection[0]),
      run: (canvas, [node]) => {
        const editor = plugin.cardEditor(node);
        const part = editor.getSelection();
        if (!part.trim()) throw new Error('select some text in the card first');
        const from = editor.posToOffset(editor.getCursor('from'));
        const before = editor.getValue();
        editor.replaceSelection('');
        node.blur();
        const canvasData = canvas.getData();
        const savedNode = canvasData.nodes.find(
          (savedCard) => savedCard.id === node.id,
        );
        // the editor may not have saved yet: work from what it showed
        if (savedNode) savedNode.text = before;
        plugin.edit(
          canvas,
          plugin.boardLibrary.extractOps(canvasData, {
            id: node.id,
            part,
            from,
          }),
          canvasData,
        );
      },
    },
  );
}

function registerArchiveCommand(plugin) {
  plugin.addCanvasCommand('archive', 'Archive selected cards', {
    menu: ['Archive', 'archive'],
    test: (canvas, selection) => selection.length > 0,
    run: async (canvas, selection) => {
      const board = plugin.activeFile().path;
      const canvasData = canvas.getData();
      const folder = plugin.boardLibrary.archiveDir(board, plugin.settings);
      if (!plugin.app.vault.getAbstractFileByPath(folder)) {
        await plugin.app.vault.createFolder(folder);
      }
      const notes = [];
      for (const node of selection) {
        const archived = plugin.boardLibrary.archiveNote(canvasData, {
          id: node.id,
          board,
          date: window.moment().format('YYYY-MM-DD'),
          contexts:
            plugin.cardContexts(node, board) || plugin.settings.archiveContexts,
        });
        notes.push(plugin.freePath(folder + '/', archived.name, '.md'));
        await plugin.app.vault.create(
          notes[notes.length - 1],
          archived.content,
        );
      }
      plugin.edit(
        canvas,
        selection.map((node) => ({ op: 'remove', id: node.id })),
      );
      plugin.undoNotice(
        canvas,
        `archived ${selection.length} card${selection.length > 1 ? 's' : ''}`,
        { files: notes },
      );
    },
  });
}

// Fold hides the cards linked to a card, following edges in the "Fold
// direction" setting (out: the cards it points to, then on; in: the cards
// pointing to it, then on). Unfold shows N levels again and folds the cards
// at level N, so a branch opens in stages, like folders. Folds are stored on
// the card (see foldOf), so Ctrl+Z undoes them. With several cards selected,
// each one that can be folded (or unfolded) is.
function registerFoldCommand(plugin) {
  function canFold(canvas, node) {
    return (
      !plugin.foldOf(node) &&
      plugin.branchLinks(canvas, plugin.settings.foldDirection).has(node.id)
    );
  }
  plugin.addCanvasCommand('fold', 'Fold branch', {
    menu: ['Fold branch', 'chevrons-down-up'],
    test: (canvas, selection) =>
      selection.some((node) => canFold(canvas, node)),
    run: (canvas, selection) =>
      plugin.setFolds(
        canvas,
        new Map(
          selection
            .filter((node) => canFold(canvas, node))
            .map((node) => [node.id, plugin.settings.foldDirection]),
        ),
      ),
  });
}

function registerUnfoldCommands(plugin) {
  for (const [levels, id, name, menu] of [
    [1, 'unfold', 'Unfold branch 1 level', ['Unfold 1 level', 'chevron-down']],
    [2, 'unfold-2', 'Unfold branch 2 levels', null],
    [3, 'unfold-3', 'Unfold branch 3 levels', null],
    [
      Infinity,
      'unfold-all',
      'Unfold whole branch',
      ['Unfold whole branch', 'chevrons-up-down'],
    ],
  ]) {
    plugin.addCanvasCommand(id, name, {
      menu: menu,
      test: (canvas, selection) =>
        selection.some((node) => plugin.unfoldTargets(canvas, node.id).length),
      run: (canvas, selection) =>
        plugin.unfold(
          canvas,
          [
            ...new Set(
              selection.flatMap((node) =>
                plugin.unfoldTargets(canvas, node.id),
              ),
            ),
          ],
          levels,
        ),
    });
  }
}

function registerFoldDirectionCommands(plugin) {
  for (const [direction, label] of [
    ['out', 'outgoing (cards it points to)'],
    ['in', 'incoming (cards pointing to it)'],
  ]) {
    plugin.addCommand({
      id: `fold-direction-${direction}`,
      name: `Fold direction: ${label}`,
      checkCallback: (checking) => {
        if (plugin.settings.foldDirection === direction) return false;
        if (!checking) {
          plugin.settings.foldDirection = direction;
          plugin.saveData(plugin.settings);
          new Notice(`Kanvas board: fold direction ${label}`);
        }
        return true;
      },
    });
  }
}

// Templates: the selection (and edges between its cards) as
// Templates/Canvas/<name>.canvas. Typing the name suggests the existing
// templates: picking one (or typing its name) overwrites it, the button says
// so.
function registerTemplateSaveCommand(plugin) {
  plugin.addCanvasCommand(
    'template-save',
    'Save selected cards as a template',
    {
      menu: ['Save as template', 'layout-template'],
      test: (canvas, selection) => selection.length > 0,
      run: (canvas) => {
        const existing = new Map(
          templateFiles(plugin).map((file) => [
            templateName(file).toLowerCase(),
            file,
          ]),
        );
        new NamePrompt(plugin.app, {
          title: 'Template name',
          onSubmit: async (name) => {
            const content = JSON.stringify(
              (({ nodes, edges }) => ({ nodes, edges }))(
                canvas.getSelectionData(),
              ),
              null,
              '\t',
            );
            const old = existing.get(name.toLowerCase());
            if (old) {
              await plugin.app.vault.modify(old, content);
              new Notice(`Kanvas board: template ${old.path} overwritten`);
              return;
            }
            if (!plugin.app.vault.getAbstractFileByPath(TEMPLATE_DIR)) {
              await plugin.app.vault.createFolder(TEMPLATE_DIR);
            }
            const file = plugin.freePath(TEMPLATE_DIR + '/', name, '.canvas');
            await plugin.app.vault.create(file, content);
            new Notice(`Kanvas board: template saved to ${file}`);
          },
          suggestions: [...existing.values()].map((file) => templateName(file)),
          overwrite: (name) => existing.has(name.toLowerCase()),
        }).open();
      },
    },
  );
}

// Selection tools grow the selection to related cards. Children: every level
// down, in the fold direction.
function registerSelectChildrenCommand(plugin) {
  function childIds(canvas, selection) {
    return new Set(
      selectedCards(selection).flatMap((node) =>
        plugin
          .branchLevels(canvas, node.id, plugin.settings.foldDirection)
          .flat(),
      ),
    );
  }
  plugin.addCanvasCommand(
    'select-children',
    'Select children (all levels down, in the fold direction)',
    {
      menu: ['Select children', 'list-tree'],
      test: (canvas, selection) =>
        [...childIds(canvas, selection)].some(
          (id) =>
            canvas.nodes.get(id) &&
            !plugin.isHidden(canvas, canvas.nodes.get(id)) &&
            !canvas.selection.has(canvas.nodes.get(id)),
        ),
      run: (canvas, selection) => {
        const ids = childIds(canvas, selection);
        plugin.selectMore(canvas, selection, (node) => ids.has(node.id));
      },
    },
  );
}

function registerSelectSameTagCommand(plugin) {
  function tagsOf(selection) {
    return new Set(
      selectedCards(selection).flatMap((node) => [...plugin.cardTagSet(node)]),
    );
  }
  plugin.addCanvasCommand('select-same-tag', 'Select cards with the same tag', {
    menu: ['Select same tag', 'tag'],
    test: (canvas, selection) => tagsOf(selection).size > 0,
    run: (canvas, selection) => {
      const tags = tagsOf(selection);
      plugin.selectMore(canvas, selection, (node) =>
        [...plugin.cardTagSet(node)].some((tag) => tags.has(tag)),
      );
    },
  });
}

function registerSelectSameColorCommand(plugin) {
  plugin.addCanvasCommand(
    'select-same-color',
    'Select cards with the same color',
    {
      menu: ['Select same color', 'palette'],
      test: (canvas, selection) => selectedCards(selection).length > 0,
      run: (canvas, selection) => {
        const colors = new Set(
          selectedCards(selection).map((node) => node.getData().color || ''),
        );
        plugin.selectMore(canvas, selection, (node) =>
          colors.has(node.getData().color || ''),
        );
      },
    },
  );
}

function registerTemplateInsertCommand(plugin) {
  plugin.addCommand({
    id: 'template-insert',
    name: 'Insert cards from template',
    checkCallback: (checking) => {
      const canvas = plugin.activeCanvas();
      if (!canvas) return false;
      if (!checking) {
        const files = templateFiles(plugin);
        if (!files.length) {
          new Notice(
            `Kanvas board: no template in ${TEMPLATE_DIR} (Save selected ` +
              `cards as a template)`,
          );
        } else {
          new Picker(plugin.app, {
            placeholder: 'Template',
            items: files,
            label: (file) => file.basename,
            onChoose: (file) => plugin.insertTemplate(canvas, file),
          }).open();
        }
      }
      return true;
    },
  });
}

function registerViewCommands(plugin) {
  plugin.addCommand({
    id: 'find',
    name: 'Search current canvas',
    checkCallback: (checking) => {
      const canvas = plugin.activeCanvas();
      if (!canvas) return false;
      if (!checking) {
        let findBar = plugin.finds.get(canvas);
        if (!findBar) {
          findBar = new FindBar(plugin, canvas);
          plugin.finds.set(canvas, findBar);
        }
        findBar.open();
      }
      return true;
    },
  });
  plugin.addCommand({
    id: 'filter',
    name: 'Toggle filter pane',
    checkCallback: (checking) => {
      const canvas = plugin.activeCanvas();
      if (!canvas) return false;
      if (!checking) plugin.pane(canvas).toggle();
      return true;
    },
  });
  plugin.addCommand({
    id: 'show-all',
    name: 'Unhide all',
    checkCallback: (checking) => {
      const canvas = plugin.activeCanvas();
      if (!canvas || !plugin.viewLabel(canvas)) return false;
      if (!checking) plugin.showAll(canvas);
      return true;
    },
  });
}

function registerRestoreCommands(plugin) {
  plugin.addCommand({
    id: 'restore',
    name: 'Restore archived card (from its archive note)',
    checkCallback: (checking) => {
      const file = plugin.app.workspace.getActiveFile();
      if (!isArchiveNote(plugin.app, file)) return false;
      if (!checking) {
        plugin
          .restore(file)
          .catch((error) => new Notice(`Kanvas board: ${error.message}`));
      }
      return true;
    },
  });
  // Right-click on an archive note: a link to it, the file explorer, its tab.
  plugin.registerEvent(
    plugin.app.workspace.on('file-menu', (menu, file) => {
      if (isArchiveNote(plugin.app, file)) {
        menu.addItem((item) =>
          item
            .setTitle('Restore archived card')
            .setIcon('archive-restore')
            .setSection('kanvas-board')
            .onClick(() =>
              plugin
                .restore(file)
                .catch((error) => new Notice(`Kanvas board: ${error.message}`)),
            ),
        );
      }
    }),
  );
}

function registerBoardCommands(plugin) {
  plugin.addCommand({
    id: 'run-pass',
    name: 'Run pass (recheck the board)',
    callback: () => plugin.runPass(),
  });
  plugin.addCommand({
    id: 'open-board',
    name: 'Open the board',
    callback: () => plugin.openBoard(),
  });
  plugin.addCommand({
    id: 'create-starter-board',
    name: 'Create a starter board (color legend and first cards)',
    callback: () => plugin.createStarterBoard(),
  });
  plugin.addRibbonIcon('kanban-square', 'Open the board (Kanvas board)', () =>
    plugin.openBoard(),
  );
}

// Right-click on one card, on a selection, or inside a card being edited
// (Extract).
function registerContextMenus(plugin) {
  const { workspace } = plugin.app;
  plugin.registerEvent(
    workspace.on('canvas:selection-menu', (menu, canvas) =>
      plugin.addActionItems(menu, canvas, [...canvas.selection]),
    ),
  );
  plugin.registerEvent(
    workspace.on('canvas:node-menu', (menu, node) => {
      const { selection } = node.canvas;
      const targets = selection.has(node) ? [...selection] : [node];
      plugin.addActionItems(menu, node.canvas, targets);
    }),
  );
  plugin.registerEvent(
    workspace.on('editor-menu', (menu, editor) => {
      const canvas = plugin.activeCanvas();
      const node =
        canvas &&
        [...canvas.selection].find(
          (each) => each.isEditing && plugin.cardEditor(each) === editor,
        );
      if (node) plugin.addActionItems(menu, canvas, [node]);
    }),
  );
}

// The command groups, in the order their right-click items appear.
const commands = [
  registerColorCommands,
  registerTidyCommands,
  registerPackCommands,
  registerUnpackCommands,
  registerMergeSplitCommands,
  registerExtractCommand,
  registerArchiveCommand,
  registerFoldCommand,
  registerUnfoldCommands,
  registerFoldDirectionCommands,
  registerTemplateSaveCommand,
  registerSelectChildrenCommand,
  registerSelectSameTagCommand,
  registerSelectSameColorCommand,
  registerTemplateInsertCommand,
  registerViewCommands,
  registerRestoreCommands,
  registerBoardCommands,
  registerContextMenus,
];

export {
  registerColorCommands,
  registerTidyCommands,
  registerPackCommands,
  registerUnpackCommands,
  registerMergeSplitCommands,
  registerExtractCommand,
  registerArchiveCommand,
  registerFoldCommand,
  registerUnfoldCommands,
  registerFoldDirectionCommands,
  registerTemplateSaveCommand,
  registerSelectChildrenCommand,
  registerSelectSameTagCommand,
  registerSelectSameColorCommand,
  registerTemplateInsertCommand,
  registerViewCommands,
  registerRestoreCommands,
  registerBoardCommands,
  registerContextMenus,
  commands,
};
