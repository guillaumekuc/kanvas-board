const baseTree = require('../board/tree.js');
const noteState = require('./noteState.js');

const tree = (board) => baseTree(board, { noteInfo: noteState });

module.exports = tree;
