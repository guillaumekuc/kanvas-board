// The card goes with every edge that touches it.
function removeNode(canvasData, operation) {
  canvasData.nodes = canvasData.nodes.filter(
    (node) => node.id !== operation.id,
  );
  canvasData.edges = canvasData.edges.filter(
    (edge) => edge.fromNode !== operation.id && edge.toNode !== operation.id,
  );
}

module.exports = removeNode;
