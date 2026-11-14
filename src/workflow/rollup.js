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
  const go = goColors();
  const t = tree(board);
  const changes = [];
  const walk = node => {
    const ops = [];
    let red = 0, yellow = 0, cards = 0, green = 0;
    for (const c of node.cards) {
      let color = c.color;
      if (c.inside) {
        const inner = walk(c.inside);
        const want = desiredColor(c, inner, go);
        let text = c.text;
        if (text !== undefined) {
          text = text.replace(/ · \d+ inside| · \d+d$/g, '');
          if (inner.red + inner.yellow) text += ` · ${inner.red + inner.yellow} inside`;
        }
        if (want !== color || (text !== undefined && text !== c.text)) {
          ops.push({ op: 'set', id: c.id, color: want === null ? '' : want, ...(text !== c.text ? { text } : {}) });
          color = want;
        }
      }
      if (color === '1') red++;
      if (color === '3') yellow++;
      cards++;
      if (color === '4') green++;
    }
    // Age suffix on yellow cards whose note has not changed for a week.
    for (const c of node.cards) {
      if (c.color !== '3' || !c.note || c.text === undefined || c.inside) continue;
      const base = c.text.replace(/ · \d+d$/, '');
      const days = staleDays();
      const text = days > 0 && c.note.ageDays >= days ? `${base} · ${c.note.ageDays}d` : base;
      if (text !== c.text) ops.push({ op: 'set', id: c.id, text });
    }
    if (ops.length) changes.push({ board: node.board, via: writeOps(node.board, ops), ops });
    return { red, yellow, allGreen: cards > 0 && green === cards };
  };
  walk(t);
  return changes;
}

module.exports = rollup;
