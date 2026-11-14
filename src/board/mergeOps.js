const byReading = require('./byReading.js');
const fitHeight = require('./fitHeight.js');
const mostUrgent = require('./mostUrgent.js');

// Text cards become the first one (in reading order): texts joined by a blank line, the most urgent color,
// every edge; edges between them are dropped, edges to the same card become one.
function mergeOps(canvasData, ids) {
  const cards = canvasData.nodes
    .filter((node) => ids.includes(node.id))
    .sort(byReading);
  if (cards.length < 2) throw new Error('merge needs 2+ cards');
  if (cards.some((node) => node.type !== 'text')) {
    throw new Error('merge takes text cards only');
  }
  const [keep, ...rest] = cards;
  const gone = new Set(rest.map((node) => node.id));
  const all = new Set(cards.map((node) => node.id));
  const text = cards.map((node) => node.text.trim()).join('\n\n');
  const width = Math.max(...cards.map((node) => node.width));
  const operations = [
    {
      op: 'set',
      id: keep.id,
      text,
      color: mostUrgent(cards.map((node) => node.color || '')),
      width,
      height: fitHeight(text, width),
    },
  ];
  // Edges to the same other card end up as one: a two-way edge if there was one or they went both ways,
  // else the one from the merged card closest to it.
  const center = (node) => [node.x + node.width / 2, node.y + node.height / 2];
  const dist = (first, second) =>
    Math.hypot(
      center(first)[0] - center(second)[0],
      center(first)[1] - center(second)[1],
    );
  const twoWay = (edge) => edge.fromEnd === 'arrow' && edge.toEnd !== 'none';
  const byOther = new Map();
  for (const edge of canvasData.edges) {
    if (!all.has(edge.fromNode) && !all.has(edge.toNode)) continue;
    if (all.has(edge.fromNode) && all.has(edge.toNode)) {
      if (gone.has(edge.fromNode) || gone.has(edge.toNode)) {
        operations.push({ op: 'unedge', id: edge.id });
      }
      continue;
    }
    const out = all.has(edge.fromNode),
      other = out ? edge.toNode : edge.fromNode;
    const length = dist(
      canvasData.nodes.find(
        (node) => node.id === (out ? edge.fromNode : edge.toNode),
      ),
      canvasData.nodes.find((node) => node.id === other) || keep,
    );
    if (!byOther.has(other)) byOther.set(other, []);
    byOther.get(other).push({ edge, out, length });
  }
  for (const list of byOther.values()) {
    list.sort((first, second) => first.length - second.length);
    const best = list.find((x) => twoWay(x.edge)) || list[0];
    const both = list.some((x) => x.out) && list.some((x) => !x.out);
    for (const x of list) {
      if (x !== best) operations.push({ op: 'unedge', id: x.edge.id });
    }
    const edge = best.edge;
    if (gone.has(edge.fromNode) || gone.has(edge.toNode)) {
      operations.push({
        op: 'retarget',
        id: edge.id,
        fromNode: gone.has(edge.fromNode) ? keep.id : edge.fromNode,
        toNode: gone.has(edge.toNode) ? keep.id : edge.toNode,
      });
    }
    if (both && !twoWay(edge)) {
      operations.push({
        op: 'ends',
        id: edge.id,
        fromEnd: 'arrow',
        toEnd: 'arrow',
      });
    }
  }
  for (const node of rest) operations.push({ op: 'remove', id: node.id });
  return operations;
}

module.exports = mergeOps;
