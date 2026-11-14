const fitHeight = require('./fitHeight.js');
const newId = require('./newId.js');

// `part` (a piece of the card's text, e.g. the editor selection) leaves the card for a new card next to it.
function extractOps(d, id, part, from) {
  const card = d.nodes.find(n => n.id === id);
  if (!card || card.type !== 'text') throw new Error('extract takes one text card');
  const at = from !== undefined && card.text.slice(from, from + part.length) === part ? from : card.text.indexOf(part);
  if (!part.trim() || at < 0) throw new Error('text not found in the card');
  const left = (card.text.slice(0, at) + card.text.slice(at + part.length)).replace(/\n{3,}/g, '\n\n').trim();
  const text = part.trim();
  const height = fitHeight(text, card.width);
  // Right next to the card even if it overlaps another (seen beats tidy), on top of the stack (added last);
  // stepped down only so repeated extracts don't hide each other exactly.
  let y = card.y;
  while (d.nodes.some(n => n.x === card.x + card.width + 40 && n.y === y)) y += 40;
  const node = { id: newId(), type: 'text', text, x: card.x + card.width + 40, y, width: card.width, height };
  if (card.color) node.color = card.color;
  return [{ op: 'set', id, text: left, height: fitHeight(left, card.width) }, { op: 'add', node }];
}

module.exports = extractOps;
