const { Notice } = require('obsidian');

function registerFoldDirectionCommands(plugin) {
  for (const [direction, label] of [
    ['out', 'outgoing (cards it points to)'],
    ['in', 'incoming (cards pointing to it)'],
  ]) {
    plugin.addCommand({
      id: `fold-direction-${direction}`,
      name: `Fold direction: ${label}`,
      checkCallback: (checking) => {
        if (plugin.settings.foldDirection === direction) return false;
        if (!checking) {
          plugin.settings.foldDirection = direction;
          plugin.saveData(plugin.settings);
          new Notice(`Kanvas board: fold direction ${label}`);
        }
        return true;
      },
    });
  }
}

module.exports = registerFoldDirectionCommands;
