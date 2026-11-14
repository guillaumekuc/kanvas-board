const newId = require('./newId.js');

// A template is a .canvas file (Templates/Canvas/). Its cards get new ids and
// land with their top-left at `origin`.
function templateOps(template, origin) {
  const nodes = template.nodes || [];
  if (!nodes.length) throw new Error('empty template');
  const minX = Math.min(...nodes.map((node) => node.x)),
    minY = Math.min(...nodes.map((node) => node.y));
  const ids = new Map(nodes.map((node) => [node.id, newId()]));
  const operations = nodes.map((node) => ({
    op: 'add',
    node: {
      ...node,
      id: ids.get(node.id),
      x: node.x - minX + origin.x,
      y: node.y - minY + origin.y,
    },
  }));
  for (const edge of template.edges || []) {
    if (ids.has(edge.fromNode) && ids.has(edge.toNode)) {
      operations.push({
        op: 'edge',
        edge: {
          ...edge,
          id: newId(),
          fromNode: ids.get(edge.fromNode),
          toNode: ids.get(edge.toNode),
        },
      });
    }
  }
  return operations;
}

module.exports = templateOps;
