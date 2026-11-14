const bounds = require('./bounds.js');
const newId = require('./newId.js');
const withGroupMembers = require('./withGroupMembers.js');

// Selected cards move to `file` (a new .canvas) at their relative places, with
// the edges between them; one card `[[file|label]]` takes their place, centered
// on where they were, and the edges that crossed the boundary now end on it.
function collapseOps(canvasData, { ids, file, label }) {
  const pick = withGroupMembers(canvasData, ids);
  const moving = canvasData.nodes.filter((node) => pick.has(node.id));
  if (!moving.length) throw new Error('nothing to collapse');
  const box = bounds(moving);
  const subcanvas = {
    nodes: moving.map((node) => ({
      ...node,
      x: node.x - box.x,
      y: node.y - box.y,
    })),
    edges: canvasData.edges.filter(
      (edge) => pick.has(edge.fromNode) && pick.has(edge.toNode),
    ),
  };
  const cardWidth = 320,
    cardHeight = 60;
  const card = {
    id: newId(),
    type: 'text',
    text: `[[${file}|${label}]]`,
    x: Math.round(box.x + (box.w - cardWidth) / 2),
    y: Math.round(box.y + (box.h - cardHeight) / 2),
    width: cardWidth,
    height: cardHeight,
  };
  const operations = [{ op: 'add', node: card }];
  for (const edge of canvasData.edges) {
    const from = pick.has(edge.fromNode),
      isToInside = pick.has(edge.toNode);
    if (from !== isToInside) {
      operations.push({
        op: 'retarget',
        id: edge.id,
        fromNode: from ? card.id : edge.fromNode,
        toNode: isToInside ? card.id : edge.toNode,
      });
    }
  }
  for (const node of moving) operations.push({ op: 'remove', id: node.id });
  return { operations, subcanvas, id: card.id };
}

module.exports = collapseOps;
