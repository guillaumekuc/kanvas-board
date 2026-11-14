// Edges that touch card `fromId` move their end to card `toId`.
function retargetOps(edges, fromId, toId) {
  return edges
    .filter((edge) => edge.fromNode === fromId || edge.toNode === fromId)
    .map((edge) => ({
      op: 'retarget',
      id: edge.id,
      fromNode: edge.fromNode === fromId ? toId : edge.fromNode,
      toNode: edge.toNode === fromId ? toId : edge.toNode,
    }));
}

module.exports = retargetOps;
