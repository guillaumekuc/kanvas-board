const { Notice } = require('obsidian');
const NamePrompt = require('../NamePrompt.js');
const UnpackChoice = require('../UnpackChoice.js');

function registerPackCommands(plugin) {
  // Pack / unpack (ids stay collapse / expand so hotkeys keep working). Pack moves cards into a new subcanvas.
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
            `packed ${selection.length} card${selection.length > 1 ? 's' : ''} into ${file}`,
            { files: [file] },
          );
        },
      }).open(),
  });

  // Unpack (dissolve) = cut and paste: the cards come out, the file goes to the trash. Other links to the file
  // (cards on any canvas, notes) would break: then a choice. Unpack (copy) = copy and paste: the file stays.
  const linked = (canvas, selection) =>
    selection.length === 1 && !!plugin.linkedCanvas(selection[0]);
  plugin.addCanvasCommand('expand', 'Unpack subcanvas (dissolve)', {
    menu: ['Unpack subcanvas (dissolve)', 'package-open'],
    test: linked,
    run: async (canvas, [node]) => {
      const file = plugin.linkedCanvas(node);
      const links = await plugin.subcanvasLinks(file, canvas, node.id);
      if (!links.length)
        return plugin.unpack(canvas, node, { file, mode: 'dissolve' });
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

module.exports = registerPackCommands;
