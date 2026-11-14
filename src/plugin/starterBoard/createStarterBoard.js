const { Notice } = require('obsidian');
const firstStepsCanvas = require('./firstStepsCanvas.js');
const legendNodes = require('./legendNodes.js');
const path = require('path');
const starterBoardPath = require('./starterBoardPath.js');

// Onboarding: a legend group and a group of first steps, one of them a wish
// to color cyan and run a pass on. Opens it.
async function createStarterBoard(plugin) {
  const { vault } = plugin.app;
  const board = starterBoardPath(vault, plugin.settings.defaultBoard);
  const legend = legendNodes((name) => plugin.colorLabel(name));
  const { nodes, edges } = firstStepsCanvas();
  const content = JSON.stringify(
    { nodes: [...legend, ...nodes], edges },
    null,
    '\t',
  );
  try {
    const folder = path.posix.dirname(board);
    if (folder !== '.' && !vault.getAbstractFileByPath(folder)) {
      await vault.createFolder(folder);
    }
    const file = await vault.create(board, content);
    await plugin.app.workspace.getLeaf(false).openFile(file);
    new Notice(`Kanvas board: starter board created (${board})`);
  } catch (error) {
    new Notice(
      `Kanvas board: could not create the starter board (${error.message})`,
    );
  }
}

module.exports = createStarterBoard;
