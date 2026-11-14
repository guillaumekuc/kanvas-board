const baseTree = require('../board/tree.js');
const noteState = require('./noteState.js');

function tree(board) {
  return baseTree(board, { noteInfo: noteState });
}

module.exports = tree;
