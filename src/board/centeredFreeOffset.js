const bounds = require('./bounds.js');
const overlapsAny = require('./overlapsAny.js');

const STEP = 40;
const MAX_STEPS = 200;

// Centered on the card, then stepped right until nothing overlaps.
function centeredFreeOffset(nodes, card, others) {
  const box = bounds(nodes);
  const offset = {
    x: Math.round(card.x + (card.width - box.w) / 2) - box.x,
    y: Math.round(card.y + (card.height - box.h) / 2) - box.y,
  };
  for (let step = 0; step < MAX_STEPS; step++) {
    if (!overlapsAny(nodes, others, offset)) break;
    offset.x += STEP;
  }
  return offset;
}

module.exports = centeredFreeOffset;
