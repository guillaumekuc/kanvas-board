const bounds = require('./bounds.js');
const overlapsAny = require('./overlapsAny.js');

const STEP = 40;
const MAX_STEPS = 400;
const ACROSS_ROWS = new Set(['LR', 'RL']);

// The block keeps the center the moving cards had; if it then overlaps a
// fixed card, it steps across the flow (down for LR and RL, right for TB and
// BT), alternating sides, to the nearest free spot.
function nearestFreeOffset(placed, { moving, fixed, direction }) {
  const before = bounds(moving);
  const after = bounds(placed);
  const center = {
    x: Math.round(
      (2 * before.x + before.width - 2 * after.x - after.width) / 2,
    ),
    y: Math.round(
      (2 * before.y + before.height - 2 * after.y - after.height) / 2,
    ),
  };
  const axis = ACROSS_ROWS.has(direction) ? 'y' : 'x';
  const offset = { ...center };
  for (let attempt = 1; attempt <= MAX_STEPS; attempt++) {
    if (!overlapsAny(placed, fixed, offset)) break;
    const side = attempt % 2 ? 1 : -1;
    offset[axis] = center[axis] + side * Math.ceil(attempt / 2) * STEP;
  }
  return offset;
}

module.exports = nearestFreeOffset;
