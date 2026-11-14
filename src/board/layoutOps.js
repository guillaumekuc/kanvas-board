const { SIDES } = require('./constants.js');
const dagrePlacement = require('./dagrePlacement.js');
const isBackEdge = require('./isBackEdge.js');
const nearestFreeOffset = require('./nearestFreeOffset.js');

// Ops that lay out `ids` (all cards when empty) with dagre; the other cards
// never move. Shared with the plugin, which passes its own dagre.
function layoutOps(canvasData, options) {
  const { ids, direction = 'TB', flow = 'out' } = options;
  const cards = canvasData.nodes.filter((node) => node.type !== 'group');
  const pick = new Set(ids && ids.length ? ids : cards.map((node) => node.id));
  const moving = cards.filter((node) => pick.has(node.id));
  const fixed = cards.filter((node) => !pick.has(node.id));
  if (!moving.length) return [];
  const inner = canvasData.edges.filter(
    (edge) => pick.has(edge.fromNode) && pick.has(edge.toNode),
  );
  const layout = { ...options, direction, flow };
  const placed = dagrePlacement(moving, inner, layout);
  const offset = nearestFreeOffset(placed, { moving, fixed, direction });
  const [fromSide, toSide] = SIDES[direction];
  function sides(edge) {
    return isBackEdge(edge, flow)
      ? { fromSide: toSide, toSide: fromSide }
      : { fromSide, toSide };
  }
  return [
    ...placed.map((card) => ({
      op: 'set',
      id: card.id,
      x: card.x + offset.x,
      y: card.y + offset.y,
      width: card.width,
      height: card.height,
    })),
    ...inner.map((edge) => ({ op: 'sides', id: edge.id, ...sides(edge) })),
  ];
}

module.exports = layoutOps;
