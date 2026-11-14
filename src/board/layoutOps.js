const { SIDES } = require('./constants.js');
const fitHeight = require('./fitHeight.js');

// Ops that lay out `ids` (all cards when empty) with dagre; the other cards never move. The laid-out block
// keeps the center of the cards it lays out, then steps until it overlaps nothing.
// Shared with the plugin, which passes its own dagre.
function layoutOps(
  canvasData,
  { ids, direction = 'TB', isFitToText = false, dagre, flow = 'out' },
) {
  const cards = canvasData.nodes.filter((node) => node.type !== 'group');
  const pick = new Set(ids && ids.length ? ids : cards.map((node) => node.id));
  const moving = cards.filter((node) => pick.has(node.id));
  const fixed = cards.filter((node) => !pick.has(node.id));
  if (!moving.length) return [];
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({
    rankdir: direction,
    nodesep: 40,
    ranksep: 80,
    marginx: 0,
    marginy: 0,
  });
  graph.setDefaultEdgeLabel(() => ({}));
  const size = (node) => ({
    width: node.width,
    height:
      isFitToText && node.type === 'text'
        ? fitHeight(node.text, node.width)
        : node.height,
  });
  for (const node of moving) graph.setNode(node.id, size(node));
  const inner = canvasData.edges.filter(
    (edge) => pick.has(edge.fromNode) && pick.has(edge.toNode),
  );
  // The direction names where a branch starts, whichever way its arrows point. With flow 'in' (the fold direction)
  // arrows point at the card they hang from, and "depends on" edges point at the prerequisite: both come first, so they rank reversed.
  const back = (edge) => flow === 'in' || /depends on/i.test(edge.label || '');
  for (const edge of inner) {
    back(edge)
      ? graph.setEdge(edge.toNode, edge.fromNode)
      : graph.setEdge(edge.fromNode, edge.toNode);
  }
  dagre.layout(graph);

  const box = (nodes) =>
    nodes.reduce(
      (box, node) => ({
        x0: Math.min(box.x0, node.x),
        y0: Math.min(box.y0, node.y),
        x1: Math.max(box.x1, node.x + node.width),
        y1: Math.max(box.y1, node.y + node.height),
      }),
      { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity },
    );
  const placed = moving.map((node) => {
    const position = graph.node(node.id);
    return {
      id: node.id,
      x: Math.round(position.x - position.width / 2),
      y: Math.round(position.y - position.height / 2),
      width: position.width,
      height: position.height,
    };
  });
  // The block keeps the center the moving cards had; if it then overlaps a fixed card, it steps across the
  // flow (down for LR and RL, right for TB and BT), alternating sides, to the nearest free spot.
  const placedBox = box(placed),
    was = box(moving);
  const shiftX = Math.round(
      (was.x0 + was.x1 - placedBox.x0 - placedBox.x1) / 2,
    ),
    shiftY = Math.round((was.y0 + was.y1 - placedBox.y0 - placedBox.y1) / 2);
  let offsetX = shiftX,
    offsetY = shiftY;
  const hits = () =>
    placed.some((placedNode) =>
      fixed.some(
        (node) =>
          placedNode.x + offsetX < node.x + node.width + 40 &&
          placedNode.x + offsetX + placedNode.width + 40 > node.x &&
          placedNode.y + offsetY < node.y + node.height + 40 &&
          placedNode.y + offsetY + placedNode.height + 40 > node.y,
      ),
    );
  for (let attempt = 1; attempt <= 400 && hits(); attempt++) {
    const step = (attempt % 2 ? 1 : -1) * Math.ceil(attempt / 2) * 40;
    if (direction === 'LR' || direction === 'RL') offsetY = shiftY + step;
    else offsetX = shiftX + step;
  }

  const operations = placed.map((placedNode) => ({
    op: 'set',
    id: placedNode.id,
    x: placedNode.x + offsetX,
    y: placedNode.y + offsetY,
    width: placedNode.width,
    height: placedNode.height,
  }));
  const [fromSide, toSide] = SIDES[direction];
  for (const edge of inner) {
    operations.push(
      back(edge)
        ? { op: 'sides', id: edge.id, fromSide: toSide, toSide: fromSide }
        : { op: 'sides', id: edge.id, fromSide, toSide },
    );
  }
  return operations;
}

module.exports = layoutOps;
