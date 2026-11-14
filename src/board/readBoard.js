const api = require('./api.js');
const readFileBoard = require('./readFileBoard.js');

function readBoard(board) {
  const out = api('read', board);
  if (out && out.startsWith('{')) {
    const canvasData = JSON.parse(out);
    return { nodes: canvasData.nodes || [], edges: canvasData.edges || [] };
  }
  return readFileBoard(board);
}

module.exports = readBoard;
