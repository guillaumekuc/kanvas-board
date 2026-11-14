const fitHeight = require('./fitHeight.js');
const newId = require('./newId.js');
const splitText = require('./splitText.js');

// One text card becomes one card per piece, stacked under it; the first keeps
// the id, color and edges.
function splitOps(canvasData, id, separator = 'paragraph') {
  const card = canvasData.nodes.find((node) => node.id === id);
  if (!card || card.type !== 'text') {
    throw new Error('split takes one text card');
  }
  const pieces = splitText(card.text || '', separator);
  if (pieces.length < 2) throw new Error(`nothing to split by ${separator}`);
  let top = card.y;
  return pieces.map((text, index) => {
    const height = fitHeight(text, card.width);
    const node = {
      ...card,
      id: index ? newId() : card.id,
      text,
      y: top,
      height,
    };
    top += height + 20;
    return index ? { op: 'add', node } : { op: 'set', id, text, height };
  });
}

module.exports = splitOps;
