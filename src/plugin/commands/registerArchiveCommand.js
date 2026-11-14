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
        { files: notes },
      );
    },
  });
}

module.exports = registerArchiveCommand;
