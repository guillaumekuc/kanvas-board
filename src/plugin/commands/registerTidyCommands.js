const { Notice } = require('obsidian');
const { LAYOUT_DIRS } = require('../constants.js');
const dagre = require('../../../dagre.min.js');
const layoutOps = require('../../board/layoutOps.js');

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

module.exports = registerTidyCommands;
