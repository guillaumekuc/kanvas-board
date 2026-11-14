const bounds = require('./bounds.js');
const byReading = require('./byReading.js');
const newId = require('./newId.js');

// The reverse (unpack): the subcanvas's cards come back centered on the card, shifted right until they overlap nothing;
// edges on the card go to the first of them in reading order. The caller trashes the .canvas file (dissolve) or
// keeps it (copy). With `group` (a label), a group is drawn around them and the edges on the card go to it.
function expandOps(canvasData, id, subcanvas, { group } = {}) {
  const card = canvasData.nodes.find((node) => node.id === id);
  if (!card) throw new Error('no node ' + id);
  if (!subcanvas.nodes.length) throw new Error('empty subcanvas');
  const taken = new Set(
    canvasData.nodes
      .map((node) => node.id)
      .concat(canvasData.edges.map((edge) => edge.id)),
  );
  const ids = new Map(
    subcanvas.nodes.map((node) => [
      node.id,
      taken.has(node.id) ? newId() : node.id,
    ]),
  );
  const box = bounds(subcanvas.nodes);
  const others = canvasData.nodes.filter((node) => node.id !== id);
  let offsetX = Math.round(card.x + (card.width - box.w) / 2) - box.x;
  const offsetY = Math.round(card.y + (card.height - box.h) / 2) - box.y;
  const hits = () =>
    subcanvas.nodes.some((subNode) =>
      others.some(
        (node) =>
          subNode.x + offsetX < node.x + node.width + 40 &&
          subNode.x + offsetX + subNode.width + 40 > node.x &&
          subNode.y + offsetY < node.y + node.height + 40 &&
          subNode.y + offsetY + subNode.height + 40 > node.y,
      ),
    );
  for (let attempt = 0; attempt < 200 && hits(); attempt++) offsetX += 40;
  const nodes = subcanvas.nodes.map((node) => ({
    ...node,
    id: ids.get(node.id),
    x: node.x + offsetX,
    y: node.y + offsetY,
  }));
  let first =
    nodes.filter((node) => node.type !== 'group').sort(byReading)[0] ||
    nodes[0];
  const operations = [];
  if (group) {
    // added first: drawn behind the cards
    const padding = 30;
    const groupX = Math.min(...nodes.map((node) => node.x)) - padding,
      groupY = Math.min(...nodes.map((node) => node.y)) - padding;
    first = {
      id: newId(),
      type: 'group',
      label: group,
      x: groupX,
      y: groupY,
      width:
        Math.max(...nodes.map((node) => node.x + node.width)) +
        padding -
        groupX,
      height:
        Math.max(...nodes.map((node) => node.y + node.height)) +
        padding -
        groupY,
    };
    operations.push({ op: 'add', node: first });
  }
  operations.push(...nodes.map((node) => ({ op: 'add', node })));
  for (const edge of subcanvas.edges) {
    operations.push({
      op: 'edge',
      edge: {
        ...edge,
        id: taken.has(edge.id) ? newId() : edge.id,
        fromNode: ids.get(edge.fromNode),
        toNode: ids.get(edge.toNode),
      },
    });
  }
  for (const edge of canvasData.edges) {
    if (edge.fromNode === id || edge.toNode === id) {
      operations.push({
        op: 'retarget',
        id: edge.id,
        fromNode: edge.fromNode === id ? first.id : edge.fromNode,
        toNode: edge.toNode === id ? first.id : edge.toNode,
      });
    }
  }
  operations.push({ op: 'remove', id });
  return group ? Object.assign(operations, { group: first.id }) : operations;
}

module.exports = expandOps;
