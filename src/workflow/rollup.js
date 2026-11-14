const desiredColor = require('./desiredColor.js');
const goColors = require('./goColors.js');
const staleDays = require('./staleDays.js');
const tree = require('./tree.js');
const writeOps = require('../board/writeOps.js');

// --- Roll-up ------------------------------------------------------------------------------------------

// red > yellow are the "needs me" colors that climb to the parent card; go colors are human choices and are
// never overwritten. The card color is the only state: a red/yellow card with a `· N inside` suffix got its
// color from the roll-up, one without it was set by an agent or User and is kept.
function rollup(board) {
  const goColorSet = goColors();
  const boardTree = tree(board);
  const changes = [];
  const walk = (node) => {
    const operations = [];
    let red = 0,
      yellow = 0,
      cards = 0,
      green = 0;
    for (const card of node.cards) {
      let color = card.color;
      if (card.inside) {
        const inner = walk(card.inside);
        const want = desiredColor(card, inner, goColorSet);
        let text = card.text;
        if (text !== undefined) {
          text = text.replace(/ · \d+ inside| · \d+d$/g, '');
          if (inner.red + inner.yellow) {
            text += ` · ${inner.red + inner.yellow} inside`;
          }
        }
        if (want !== color || (text !== undefined && text !== card.text)) {
          operations.push({
            op: 'set',
            id: card.id,
            color: want === null ? '' : want,
            ...(text !== card.text ? { text } : {}),
          });
          color = want;
        }
      }
      if (color === '1') red++;
      if (color === '3') yellow++;
      cards++;
      if (color === '4') green++;
    }
    // Age suffix on yellow cards whose note has not changed for a week.
    for (const card of node.cards) {
      if (
        card.color !== '3' ||
        !card.note ||
        card.text === undefined ||
        card.inside
      ) {
        continue;
      }
      const base = card.text.replace(/ · \d+d$/, '');
      const days = staleDays();
      const text =
        days > 0 && card.note.ageDays >= days
          ? `${base} · ${card.note.ageDays}d`
          : base;
      if (text !== card.text) operations.push({ op: 'set', id: card.id, text });
    }
    if (operations.length) {
      changes.push({
        board: node.board,
        via: writeOps(node.board, operations),
        operations,
      });
    }
    return { red, yellow, allGreen: cards > 0 && green === cards };
  };
  walk(boardTree);
  return changes;
}

module.exports = rollup;
