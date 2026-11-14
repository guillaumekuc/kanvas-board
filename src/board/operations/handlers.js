// Command pattern: each operation name maps to the function that applies it.
const removeNode = require('./removeNode.js');
const setNode = require('./setNode.js');
const updateEdge = require('./updateEdge.js');

module.exports = {
  set: setNode,
  add: (canvasData, operation) => {
    canvasData.nodes.push(operation.node);
  },
  remove: removeNode,
  edge: (canvasData, operation) => {
    canvasData.edges.push(operation.edge);
  },
  unedge: (canvasData, operation) => {
    canvasData.edges = canvasData.edges.filter(
      (edge) => edge.id !== operation.id,
    );
  },
  sides: (canvasData, operation) =>
    updateEdge(canvasData, operation, ['fromSide', 'toSide']),
  retarget: (canvasData, operation) =>
    updateEdge(canvasData, operation, ['fromNode', 'toNode']),
  ends: (canvasData, operation) =>
    updateEdge(canvasData, operation, ['fromEnd', 'toEnd']),
};
