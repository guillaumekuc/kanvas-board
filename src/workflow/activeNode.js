const { WAITING } = require('./constants.js');

function activeNode(t, total, active) {
  const ids = new Set(
    t.cards.filter((c) => active.has(c.color)).map((c) => c.id),
  );
  const near = new Set();
  for (const e of t.edges) {
    if (ids.has(e.from) && !ids.has(e.to)) near.add(e.to);
    if (ids.has(e.to) && !ids.has(e.from)) near.add(e.from);
  }
  const cards = [],
    context = [];
  for (const c of t.cards) {
    if (WAITING.has(c.color)) total.waiting++;
    const inside = c.inside && activeNode(c.inside, total, active);
    if (ids.has(c.id) || (inside && inside.cards.length)) {
cards.push({
        ...c,
        inside: inside && inside.cards.length ? inside : undefined,
      });
} else if (near.has(c.id)) {context.push({ id: c.id, color: c.color, text: c.text, file: c.file });}
  }
  const kept = new Set(cards.map((c) => c.id));
  const edges = t.edges.filter((e) => kept.has(e.from) || kept.has(e.to));
  return { board: t.board, cards, context, edges };
}

module.exports = activeNode;
