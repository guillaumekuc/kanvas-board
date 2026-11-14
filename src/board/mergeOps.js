const byReading = require('./byReading.js');
const fitHeight = require('./fitHeight.js');
const mostUrgent = require('./mostUrgent.js');

// Text cards become the first one (in reading order): texts joined by a blank line, the most urgent color,
// every edge; edges between them are dropped, edges to the same card become one.
function mergeOps(d, ids) {
  const cards = d.nodes.filter(n => ids.includes(n.id)).sort(byReading);
  if (cards.length < 2) throw new Error('merge needs 2+ cards');
  if (cards.some(n => n.type !== 'text')) throw new Error('merge takes text cards only');
  const [keep, ...rest] = cards;
  const gone = new Set(rest.map(n => n.id));
  const all = new Set(cards.map(n => n.id));
  const text = cards.map(n => n.text.trim()).join('\n\n');
  const width = Math.max(...cards.map(n => n.width));
  const ops = [{ op: 'set', id: keep.id, text, color: mostUrgent(cards.map(n => n.color || '')), width, height: fitHeight(text, width) }];
  // Edges to the same other card end up as one: a two-way edge if there was one or they went both ways,
  // else the one from the merged card closest to it.
  const center = n => [n.x + n.width / 2, n.y + n.height / 2];
  const dist = (a, b) => Math.hypot(center(a)[0] - center(b)[0], center(a)[1] - center(b)[1]);
  const twoWay = e => e.fromEnd === 'arrow' && e.toEnd !== 'none';
  const byOther = new Map();
  for (const e of d.edges) {
    if (!all.has(e.fromNode) && !all.has(e.toNode)) continue;
    if (all.has(e.fromNode) && all.has(e.toNode)) { if (gone.has(e.fromNode) || gone.has(e.toNode)) ops.push({ op: 'unedge', id: e.id }); continue; }
    const out = all.has(e.fromNode), other = out ? e.toNode : e.fromNode;
    const len = dist(d.nodes.find(n => n.id === (out ? e.fromNode : e.toNode)), d.nodes.find(n => n.id === other) || keep);
    if (!byOther.has(other)) byOther.set(other, []);
    byOther.get(other).push({ e, out, len });
  }
  for (const list of byOther.values()) {
    list.sort((a, b) => a.len - b.len);
    const best = list.find(x => twoWay(x.e)) || list[0];
    const both = list.some(x => x.out) && list.some(x => !x.out);
    for (const x of list) if (x !== best) ops.push({ op: 'unedge', id: x.e.id });
    const e = best.e;
    if (gone.has(e.fromNode) || gone.has(e.toNode))
      ops.push({ op: 'retarget', id: e.id, fromNode: gone.has(e.fromNode) ? keep.id : e.fromNode, toNode: gone.has(e.toNode) ? keep.id : e.toNode });
    if (both && !twoWay(e)) ops.push({ op: 'ends', id: e.id, fromEnd: 'arrow', toEnd: 'arrow' });
  }
  for (const n of rest) ops.push({ op: 'remove', id: n.id });
  return ops;
}

module.exports = mergeOps;
