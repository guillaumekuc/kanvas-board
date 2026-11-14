const byReading = require('./byReading.js');
const fitHeight = require('./fitHeight.js');
const mergeEdgeOps = require('./mergeEdgeOps.js');
const mostUrgent = require('./mostUrgent.js');

// Text cards become the first one (in reading order): texts joined by a
// blank line, the most urgent color, every edge (see mergeEdgeOps).
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
  const text = cards.map((node) => node.text.trim()).join('\n\n');
  const width = Math.max(...cards.map((node) => node.width));
  const color = mostUrgent(cards.map((node) => node.color || ''));
  const height = fitHeight(text, width);
  return [
    { op: 'set', id: keep.id, text, color, width, height },
    ...mergeEdgeOps(canvasData, { keep, gone }),
    ...rest.map((node) => ({ op: 'remove', id: node.id })),
  ];
}

module.exports = mergeOps;
