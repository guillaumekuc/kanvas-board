// A missing edge is skipped: the user may have deleted it meanwhile.
function updateEdge(canvasData, operation, fields) {
  const edge = canvasData.edges.find((edge) => edge.id === operation.id);
  if (!edge) return;
  for (const field of fields) edge[field] = operation[field];
}

module.exports = updateEdge;
