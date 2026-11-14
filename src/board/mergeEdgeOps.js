const centerDistance = require('./centerDistance.js');
const keptEdgeOps = require('./keptEdgeOps.js');

// Edges between the merged cards are dropped; edges to the same other card
// become one (see keptEdgeOps).
function mergeEdgeOps(canvasData, { keep, gone }) {
  const merged = new Set([keep.id, ...gone]);
  const nodeById = (id) => canvasData.nodes.find((node) => node.id === id);
  const operations = [];
  const linksByOther = new Map();
  for (const edge of canvasData.edges) {
    const isOutgoing = merged.has(edge.fromNode);
    const isIncoming = merged.has(edge.toNode);
    const isInside = isOutgoing && isIncoming;
    const touchesGone = gone.has(edge.fromNode) || gone.has(edge.toNode);
    if (isInside && touchesGone) operations.push({ op: 'unedge', id: edge.id });
    if (isInside || (!isOutgoing && !isIncoming)) continue;
    const [mine, other] = isOutgoing
      ? [edge.fromNode, edge.toNode]
      : [edge.toNode, edge.fromNode];
    const length = centerDistance(nodeById(mine), nodeById(other) || keep);
    if (!linksByOther.has(other)) linksByOther.set(other, []);
    linksByOther.get(other).push({ edge, isOutgoing, length });
  }
  for (const links of linksByOther.values()) {
    operations.push(...keptEdgeOps(links, { keep, gone }));
  }
  return operations;
}

module.exports = mergeEdgeOps;
