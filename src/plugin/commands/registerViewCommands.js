const FindBar = require('../FindBar.js');

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
          findBar = new FindBar(this, canvas);
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

module.exports = registerViewCommands;
