const { Notice } = require('obsidian');
const UnpackChoice = require('../UnpackChoice.js');

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

module.exports = registerUnpackCommands;
