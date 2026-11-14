const isTwoWay = require('./isTwoWay.js');

// Edges between the merged cards and one other card end up as one: a two-way
// edge if there was one or they went both ways, else the one from the merged
// card closest to it. `links`: [{ edge, isOutgoing, length }].
function keptEdgeOps(links, { keep, gone }) {
  const sorted = [...links].sort(
    (first, second) => first.length - second.length,
  );
  const best = sorted.find((link) => isTwoWay(link.edge)) || sorted[0];
  const hasBothWays =
    links.some((link) => link.isOutgoing) &&
    links.some((link) => !link.isOutgoing);
  const operations = sorted
    .filter((link) => link !== best)
    .map((link) => ({ op: 'unedge', id: link.edge.id }));
  const { edge } = best;
  if (gone.has(edge.fromNode) || gone.has(edge.toNode)) {
    operations.push({
      op: 'retarget',
      id: edge.id,
      fromNode: gone.has(edge.fromNode) ? keep.id : edge.fromNode,
      toNode: gone.has(edge.toNode) ? keep.id : edge.toNode,
    });
  }
  if (hasBothWays && !isTwoWay(edge)) {
    operations.push({
      op: 'ends',
      id: edge.id,
      fromEnd: 'arrow',
      toEnd: 'arrow',
    });
  }
  return operations;
}

module.exports = keptEdgeOps;
