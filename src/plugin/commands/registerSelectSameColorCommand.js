const selectedCards = require('../selectedCards.js');

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

module.exports = registerSelectSameColorCommand;
