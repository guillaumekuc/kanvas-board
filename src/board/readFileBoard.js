const abs = require('./abs.js');
const fileSystem = require('fs');

const readFileBoard = (board) => {
  const canvasData = JSON.parse(
    fileSystem.readFileSync(abs(board), 'utf8') || '{}',
  );
  canvasData.nodes ||= [];
  canvasData.edges ||= [];
  return canvasData;
};

module.exports = readFileBoard;
