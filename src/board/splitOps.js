const fitHeight = require('./fitHeight.js');
const newId = require('./newId.js');
const splitText = require('./splitText.js');

// One text card becomes one card per piece, stacked under it; the first keeps the id, color and edges.
function splitOps(d, id, by = 'paragraph') {
  const card = d.nodes.find(n => n.id === id);
  if (!card || card.type !== 'text') throw new Error('split takes one text card');
  const pieces = splitText(card.text || '', by);
  if (pieces.length < 2) throw new Error(`nothing to split by ${by}`);
  let y = card.y;
  return pieces.map((text, i) => {
    const height = fitHeight(text, card.width);
    const node = { ...card, id: i ? newId() : card.id, text, y, height };
    y += height + 20;
    return i ? { op: 'add', node } : { op: 'set', id, text, height };
  });
}

module.exports = splitOps;
