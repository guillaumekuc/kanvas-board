const newId = require('./newId.js');

function templateOps(tpl, at) {
  const nodes = tpl.nodes || [];
  if (!nodes.length) throw new Error('empty template');
  const x0 = Math.min(...nodes.map((n) => n.x)),
    y0 = Math.min(...nodes.map((n) => n.y));
  const ids = new Map(nodes.map((n) => [n.id, newId()]));
  const ops = nodes.map((n) => ({
    op: 'add',
    node: { ...n, id: ids.get(n.id), x: n.x - x0 + at.x, y: n.y - y0 + at.y },
  }));
  for (const e of tpl.edges || []) {
if (ids.has(e.fromNode) && ids.has(e.toNode)) {
ops.push({
        op: 'edge',
        edge: {
          ...e,
          id: newId(),
          fromNode: ids.get(e.fromNode),
          toNode: ids.get(e.toNode),
        },
      });
}
}
  return ops;
}

module.exports = templateOps;
