const vaultPath = require('./vaultPath.js');
const fileSystem = require('fs');

function readFileBoard(board) {
  const canvasData = JSON.parse(
    fileSystem.readFileSync(vaultPath(board), 'utf8') || '{}',
  );
  canvasData.nodes ||= [];
  canvasData.edges ||= [];
  return canvasData;
}

module.exports = readFileBoard;
