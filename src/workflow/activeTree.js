const { WORKING } = require('./constants.js');
const activeNode = require('./activeNode.js');
const goColors = require('./goColors.js');

// --active: only what a pass needs. Go/orange cards with their notes, the cards edged to them (once each,
// text only, as context), nested boards only when they hold active cards, and the yellow/red count.
function activeTree(boardTree) {
  const active = new Set([...goColors(), WORKING]);
  const total = { waiting: 0 };
  const filtered = activeNode(boardTree, total, active);
  return {
    board: filtered.board,
    waiting: total.waiting,
    cards: filtered.cards,
    context: filtered.context,
    edges: filtered.edges,
  };
}

module.exports = activeTree;
