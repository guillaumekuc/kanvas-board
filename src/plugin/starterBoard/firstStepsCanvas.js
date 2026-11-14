const { COLUMN_WIDTH, STEPS, STEPS_X, TRY_IT } = require('./constants.js');
const newId = require('../../board/newId.js');

const STEP_HEIGHT = 160;

// The first steps, chained top to bottom, then a wish to try a pass on.
function firstStepsCanvas() {
  const group = {
    id: newId(),
    type: 'group',
    label: 'First steps',
    x: STEPS_X - 40,
    y: -80,
    width: COLUMN_WIDTH + 80,
    height: STEPS.length * STEP_HEIGHT + 280,
  };
  const card = (text, row) => ({
    id: newId(),
    type: 'text',
    text,
    x: STEPS_X,
    y: row * STEP_HEIGHT,
    width: COLUMN_WIDTH,
    height: 130,
  });
  const steps = [];
  const edges = [];
  for (const [row, text] of STEPS.entries()) {
    const step = card(text, row);
    const above = steps[steps.length - 1];
    steps.push(step);
    if (!above) continue;
    edges.push({
      id: newId(),
      fromNode: above.id,
      fromSide: 'bottom',
      toNode: step.id,
      toSide: 'top',
    });
  }
  const tryIt = {
    ...card(TRY_IT, STEPS.length),
    y: STEPS.length * STEP_HEIGHT + 20,
  };
  return { nodes: [group, ...steps, tryIt], edges };
}

module.exports = firstStepsCanvas;
