const { Notice } = require('obsidian');

function registerArchiveCommands(plugin) {
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
          contexts: plugin.cardContexts(node, board),
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
        notes,
      );
    },
  });

  const isArchived = (file) => {
    const frontmatter =
      file &&
      file.extension === 'md' &&
      (plugin.app.metadataCache.getFileCache(file) || {}).frontmatter;
    return !!(frontmatter && frontmatter['archived-from']);
  };
  plugin.addCommand({
    id: 'restore',
    name: 'Restore archived card (from its archive note)',
    checkCallback: (checking) => {
      const file = plugin.app.workspace.getActiveFile();
      if (!isArchived(file)) return false;
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
      if (isArchived(file)) {
        menu.addItem((item) =>
          item
            .setTitle('Restore archived card')
            .setIcon('archive-restore')
            .setSection('canvas-board')
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

module.exports = registerArchiveCommands;
