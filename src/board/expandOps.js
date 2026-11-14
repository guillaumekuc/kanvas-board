const bounds = require('./bounds.js');
const byReading = require('./byReading.js');
const newId = require('./newId.js');

// The reverse (unpack): the subcanvas's cards come back centered on the card, shifted right until they overlap nothing;
// edges on the card go to the first of them in reading order. The caller trashes the .canvas file (dissolve) or
// keeps it (copy). With `group` (a label), a group is drawn around them and the edges on the card go to it.
function expandOps(d, id, sub, { group } = {}) {
  const card = d.nodes.find((n) => n.id === id);
  if (!card) throw new Error('no node ' + id);
  if (!sub.nodes.length) throw new Error('empty subcanvas');
  const taken = new Set(
    d.nodes.map((n) => n.id).concat(d.edges.map((e) => e.id)),
  );
  const ids = new Map(
    sub.nodes.map((n) => [n.id, taken.has(n.id) ? newId() : n.id]),
  );
  const b = bounds(sub.nodes);
  const others = d.nodes.filter((n) => n.id !== id);
  let ox = Math.round(card.x + (card.width - b.w) / 2) - b.x;
  const oy = Math.round(card.y + (card.height - b.h) / 2) - b.y;
  const hits = () =>
    sub.nodes.some((p) =>
      others.some(
        (n) =>
          p.x + ox < n.x + n.width + 40 &&
          p.x + ox + p.width + 40 > n.x &&
          p.y + oy < n.y + n.height + 40 &&
          p.y + oy + p.height + 40 > n.y,
      ),
    );
  for (let k = 0; k < 200 && hits(); k++) ox += 40;
  const nodes = sub.nodes.map((n) => ({
    ...n,
    id: ids.get(n.id),
    x: n.x + ox,
    y: n.y + oy,
  }));
  let first =
    nodes.filter((n) => n.type !== 'group').sort(byReading)[0] || nodes[0];
  const ops = [];
  if (group) {
    // added first: drawn behind the cards
    const P = 30;
    const gx = Math.min(...nodes.map((n) => n.x)) - P,
      gy = Math.min(...nodes.map((n) => n.y)) - P;
    first = {
      id: newId(),
      type: 'group',
      label: group,
      x: gx,
      y: gy,
      width: Math.max(...nodes.map((n) => n.x + n.width)) + P - gx,
      height: Math.max(...nodes.map((n) => n.y + n.height)) + P - gy,
    };
    ops.push({ op: 'add', node: first });
  }
  ops.push(...nodes.map((node) => ({ op: 'add', node })));
  for (const e of sub.edges) {
ops.push({
      op: 'edge',
      edge: {
        ...e,
        id: taken.has(e.id) ? newId() : e.id,
        fromNode: ids.get(e.fromNode),
        toNode: ids.get(e.toNode),
      },
    });
}
  for (const e of d.edges) {
if (e.fromNode === id || e.toNode === id) {
ops.push({
        op: 'retarget',
        id: e.id,
        fromNode: e.fromNode === id ? first.id : e.fromNode,
        toNode: e.toNode === id ? first.id : e.toNode,
      });
}
}
  ops.push({ op: 'remove', id });
  return group ? Object.assign(ops, { group: first.id }) : ops;
}

module.exports = expandOps;
