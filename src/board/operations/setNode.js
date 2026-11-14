const retype = require('./retype.js');
const setColor = require('./setColor.js');

const GEOMETRY = ['x', 'y', 'width', 'height'];

// Returns the card's id when its type changed (text <-> file).
function setNode(canvasData, operation) {
  const node = canvasData.nodes.find((node) => node.id === operation.id);
  if (!node) throw new Error('no node ' + operation.id);
  if (operation.color !== undefined) setColor(node, operation.color);
  const retyped = [];
  if (operation.file !== undefined && retype(node, 'file', operation.file)) {
    retyped.push(node.id);
  }
  if (operation.text !== undefined && retype(node, 'text', operation.text)) {
    retyped.push(node.id);
  }
  for (const field of GEOMETRY) {
    if (operation[field] !== undefined) node[field] = operation[field];
  }
  return retyped;
}

module.exports = setNode;
