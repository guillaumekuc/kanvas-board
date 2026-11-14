const vaultPath = require('./vaultPath.js');
const fileSystem = require('fs');

const readFileBoard = (board) => {
  const canvasData = JSON.parse(
    fileSystem.readFileSync(vaultPath(board), 'utf8') || '{}',
  );
  canvasData.nodes ||= [];
  canvasData.edges ||= [];
  return canvasData;
};

module.exports = readFileBoard;
