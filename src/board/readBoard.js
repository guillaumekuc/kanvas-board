const api = require('./api.js');
const readFileBoard = require('./readFileBoard.js');

function readBoard(board) {
  const out = api('read', board);
  if (out && out.startsWith('{')) { const d = JSON.parse(out); return { nodes: d.nodes || [], edges: d.edges || [] }; }
  return readFileBoard(board);
}

module.exports = readBoard;
