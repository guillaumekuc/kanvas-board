const bounds = require('./bounds.js');
const newId = require('./newId.js');
const withGroupMembers = require('./withGroupMembers.js');

function collapseOps(d, ids, file, label) {
  const pick = withGroupMembers(d, ids);
  const moving = d.nodes.filter(n => pick.has(n.id));
  if (!moving.length) throw new Error('nothing to collapse');
  const b = bounds(moving);
  const sub = {
    nodes: moving.map(n => ({ ...n, x: n.x - b.x, y: n.y - b.y })),
    edges: d.edges.filter(e => pick.has(e.fromNode) && pick.has(e.toNode)),
  };
  const W = 320, H = 60;
  const card = { id: newId(), type: 'text', text: `[[${file}|${label}]]`,
    x: Math.round(b.x + (b.w - W) / 2), y: Math.round(b.y + (b.h - H) / 2), width: W, height: H };
  const ops = [{ op: 'add', node: card }];
  for (const e of d.edges) {
    const from = pick.has(e.fromNode), to = pick.has(e.toNode);
    if (from !== to) ops.push({ op: 'retarget', id: e.id, fromNode: from ? card.id : e.fromNode, toNode: to ? card.id : e.toNode });
  }
  for (const n of moving) ops.push({ op: 'remove', id: n.id });
  return { ops, sub, id: card.id };
}

module.exports = collapseOps;
