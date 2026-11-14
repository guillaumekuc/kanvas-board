const { WAITING } = require('./constants.js');

function activeNode(boardTree, total, active) {
  const ids = new Set(
    boardTree.cards
      .filter((card) => active.has(card.color))
      .map((card) => card.id),
  );
  const near = new Set();
  for (const edge of boardTree.edges) {
    if (ids.has(edge.from) && !ids.has(edge.to)) near.add(edge.to);
    if (ids.has(edge.to) && !ids.has(edge.from)) near.add(edge.from);
  }
  const cards = [],
    context = [];
  for (const card of boardTree.cards) {
    if (WAITING.has(card.color)) total.waiting++;
    const inside = card.inside && activeNode(card.inside, total, active);
    if (ids.has(card.id) || (inside && inside.cards.length)) {
      cards.push({
        ...card,
        inside: inside && inside.cards.length ? inside : undefined,
      });
    } else if (near.has(card.id)) {
      context.push({
        id: card.id,
        color: card.color,
        text: card.text,
        file: card.file,
      });
    }
  }
  const kept = new Set(cards.map((card) => card.id));
  const edges = boardTree.edges.filter(
    (edge) => kept.has(edge.from) || kept.has(edge.to),
  );
  return { board: boardTree.board, cards, context, edges };
}

module.exports = activeNode;
