const { Notice } = require('obsidian');
const isArchiveNote = require('../isArchiveNote.js');

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

module.exports = registerRestoreCommands;
