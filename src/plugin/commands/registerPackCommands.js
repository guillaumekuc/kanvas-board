const NamePrompt = require('../NamePrompt.js');

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

module.exports = registerPackCommands;
