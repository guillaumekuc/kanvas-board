const newId = require('./newId.js');

const PADDING = 30;

function groupAround(nodes, label) {
  const left = Math.min(...nodes.map((node) => node.x)) - PADDING;
  const top = Math.min(...nodes.map((node) => node.y)) - PADDING;
  const right = Math.max(...nodes.map((node) => node.x + node.width));
  const bottom = Math.max(...nodes.map((node) => node.y + node.height));
  return {
    id: newId(),
    type: 'group',
    label,
    x: left,
    y: top,
    width: right + PADDING - left,
    height: bottom + PADDING - top,
  };
}

module.exports = groupAround;
