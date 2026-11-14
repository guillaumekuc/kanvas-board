const { COLORS } = require('../constants.js');

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

module.exports = registerColorCommands;
