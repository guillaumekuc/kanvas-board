const { SIDES } = require('./constants.js');
const fitHeight = require('./fitHeight.js');

// Ops that lay out `ids` (all cards when empty) with dagre; the other cards never move. The laid-out block
// keeps the center of the cards it lays out, then steps until it overlaps nothing.
// Shared with the plugin, which passes its own dagre.
function layoutOps(d, { ids, dir = 'TB', fit = false, dagre, flow = 'out' }) {
  const cards = d.nodes.filter((n) => n.type !== 'group');
  const pick = new Set(ids && ids.length ? ids : cards.map((n) => n.id));
  const moving = cards.filter((n) => pick.has(n.id));
  const fixed = cards.filter((n) => !pick.has(n.id));
  if (!moving.length) return [];
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: dir,
    nodesep: 40,
    ranksep: 80,
    marginx: 0,
    marginy: 0,
  });
  g.setDefaultEdgeLabel(() => ({}));
  const size = (n) => ({
    width: n.width,
    height: fit && n.type === 'text' ? fitHeight(n.text, n.width) : n.height,
  });
  for (const n of moving) g.setNode(n.id, size(n));
  const inner = d.edges.filter(
    (e) => pick.has(e.fromNode) && pick.has(e.toNode),
  );
  // The direction names where a branch starts, whichever way its arrows point. With flow 'in' (the fold direction)
  // arrows point at the card they hang from, and "depends on" edges point at the prerequisite: both come first, so they rank reversed.
  const back = (e) => flow === 'in' || /depends on/i.test(e.label || '');
  for (const e of inner) {back(e) ? g.setEdge(e.toNode, e.fromNode) : g.setEdge(e.fromNode, e.toNode);}
  dagre.layout(g);

  const box = (ns) =>
    ns.reduce(
      (b, n) => ({
        x0: Math.min(b.x0, n.x),
        y0: Math.min(b.y0, n.y),
        x1: Math.max(b.x1, n.x + n.width),
        y1: Math.max(b.y1, n.y + n.height),
      }),
      { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity },
    );
  const placed = moving.map((n) => {
    const p = g.node(n.id);
    return {
      id: n.id,
      x: Math.round(p.x - p.width / 2),
      y: Math.round(p.y - p.height / 2),
      width: p.width,
      height: p.height,
    };
  });
  // The block keeps the center the moving cards had; if it then overlaps a fixed card, it steps across the
  // flow (down for LR and RL, right for TB and BT), alternating sides, to the nearest free spot.
  const b = box(placed),
    was = box(moving);
  const cx = Math.round((was.x0 + was.x1 - b.x0 - b.x1) / 2),
    cy = Math.round((was.y0 + was.y1 - b.y0 - b.y1) / 2);
  let ox = cx,
    oy = cy;
  const hits = () =>
    placed.some((p) =>
      fixed.some(
        (n) =>
          p.x + ox < n.x + n.width + 40 &&
          p.x + ox + p.width + 40 > n.x &&
          p.y + oy < n.y + n.height + 40 &&
          p.y + oy + p.height + 40 > n.y,
      ),
    );
  for (let k = 1; k <= 400 && hits(); k++) {
    const step = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 40;
    if (dir === 'LR' || dir === 'RL') oy = cy + step;
    else ox = cx + step;
  }

  const ops = placed.map((p) => ({
    op: 'set',
    id: p.id,
    x: p.x + ox,
    y: p.y + oy,
    width: p.width,
    height: p.height,
  }));
  const [fromSide, toSide] = SIDES[dir];
  for (const e of inner) {
ops.push(
      back(e)
        ? { op: 'sides', id: e.id, fromSide: toSide, toSide: fromSide }
        : { op: 'sides', id: e.id, fromSide, toSide },
    );
}
  return ops;
}

module.exports = layoutOps;
