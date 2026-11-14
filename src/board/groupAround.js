const newId = require('./newId.js');

const PADDING = 30;

// A group node framing `nodes` with some padding.
function groupAround(nodes, label) {
  const x = Math.min(...nodes.map((node) => node.x)) - PADDING;
  const y = Math.min(...nodes.map((node) => node.y)) - PADDING;
  const right = Math.max(...nodes.map((node) => node.x + node.width));
  const bottom = Math.max(...nodes.map((node) => node.y + node.height));
  return {
    id: newId(),
    type: 'group',
    label,
    x,
    y,
    width: right + PADDING - x,
    height: bottom + PADDING - y,
  };
}

module.exports = groupAround;
