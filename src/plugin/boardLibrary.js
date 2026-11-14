// Facade: the board operations the plugin shares with the canvas.js CLI.
const { SIDES, TEMPLATE_DIR } = require('../board/constants.js');

module.exports = {
  SIDES,
  TEMPLATE_DIR,
  applyOps: require('../board/applyOps.js'),
  archiveDir: require('../board/archiveDir.js'),
  archiveNote: require('../board/archiveNote.js'),
  collapseOps: require('../board/collapseOps.js'),
  expandOps: require('../board/expandOps.js'),
  extractOps: require('../board/extractOps.js'),
  layoutOps: require('../board/layoutOps.js'),
  mergeOps: require('../board/mergeOps.js'),
  plainLines: require('../board/plainLines.js'),
  relinkText: require('../board/relinkText.js'),
  restoreOps: require('../board/restoreOps.js'),
  splitOps: require('../board/splitOps.js'),
  templateOps: require('../board/templateOps.js'),
};
