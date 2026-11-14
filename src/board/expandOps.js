const groupAround = require('./groupAround.js');
const newId = require('./newId.js');
const centeredFreeOffset = require('./centeredFreeOffset.js');
const firstInReading = require('./firstInReading.js');
const retargetOps = require('./retargetOps.js');

// The reverse (unpack): the subcanvas's cards come back centered on the card,
// shifted right until they overlap nothing; edges on the card go to the first
// of them in reading order. The caller trashes the .canvas file (dissolve) or
// keeps it (copy). With `group` (a label), a group is drawn around them and
// the edges on the card go to it.
function expandOps(canvasData, { id, subcanvas, group }) {
  const card = canvasData.nodes.find((node) => node.id === id);
  if (!card) throw new Error('no node ' + id);
  if (!subcanvas.nodes.length) throw new Error('empty subcanvas');
  const taken = new Set(
    [...canvasData.nodes, ...canvasData.edges].map((item) => item.id),
  );
  function freeId(itemId) {
    return taken.has(itemId) ? newId() : itemId;
  }
  const ids = new Map(
    subcanvas.nodes.map((node) => [node.id, freeId(node.id)]),
  );
  const others = canvasData.nodes.filter((node) => node.id !== id);
  const offset = centeredFreeOffset(subcanvas.nodes, card, others);
  const nodes = subcanvas.nodes.map((node) => ({
    ...node,
    id: ids.get(node.id),
    x: node.x + offset.x,
    y: node.y + offset.y,
  }));
  // The group is added first so it is drawn behind the cards.
  const frame = group ? groupAround(nodes, group) : null;
  const target = frame || firstInReading(nodes);
  const edges = subcanvas.edges.map((edge) => ({
    ...edge,
    id: freeId(edge.id),
    fromNode: ids.get(edge.fromNode),
    toNode: ids.get(edge.toNode),
  }));
  const operations = [
    ...(frame ? [{ op: 'add', node: frame }] : []),
    ...nodes.map((node) => ({ op: 'add', node })),
    ...edges.map((edge) => ({ op: 'edge', edge })),
    ...retargetOps(canvasData.edges, id, target.id),
    { op: 'remove', id },
  ];
  return frame ? Object.assign(operations, { group: frame.id }) : operations;
}

module.exports = expandOps;
