const ageSuffixOperation = require('./ageSuffixOperation.js');
const colorCounts = require('./colorCounts.js');
const goColors = require('./goColors.js');
const nestedCardUpdate = require('./nestedCardUpdate.js');
const staleDays = require('./staleDays.js');
const tree = require('./tree.js');
const writeOps = require('../board/writeOps.js');

// red > yellow are the "needs me" colors that climb to the parent card; go
// colors are human choices and are never overwritten. The card color is the
// only state: a red/yellow card with a `· N inside` suffix got its color from
// the roll-up, one without it was set by an agent or User and is kept.
// Nested boards are written before the boards that link them.
function rollup(board) {
  const goColorSet = goColors();
  const days = staleDays();
  const changes = [];
  function walk(node) {
    const operations = [];
    const colors = node.cards.map((card) => {
      if (!card.inside) return card.color;
      const update = nestedCardUpdate(card, walk(card.inside), goColorSet);
      if (update.operation) operations.push(update.operation);
      return update.color;
    });
    const ages = node.cards.map((card) => ageSuffixOperation(card, days));
    operations.push(...ages.filter(Boolean));
    if (operations.length) {
      const via = writeOps(node.board, operations);
      changes.push({ board: node.board, via, operations });
    }
    return colorCounts(colors);
  }
  walk(tree(board));
  return changes;
}

module.exports = rollup;
