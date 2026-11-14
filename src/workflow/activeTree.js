const { WORKING } = require('./constants.js');
const activeNode = require('./activeNode.js');
const goColors = require('./goColors.js');

// --active: only what a pass needs. Go/orange cards with their notes, the cards edged to them (once each,
// text only, as context), nested boards only when they hold active cards, and the yellow/red count.
function activeTree(t) {
  const active = new Set([...goColors(), WORKING]);
  const total = { waiting: 0 };
  const a = activeNode(t, total, active);
  return { board: a.board, waiting: total.waiting, cards: a.cards, context: a.context, edges: a.edges };
}

module.exports = activeTree;
