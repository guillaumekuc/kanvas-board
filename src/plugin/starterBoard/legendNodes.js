const { COLOR_NUM, WORKFLOW } = require('../constants.js');
const { COLUMN_WIDTH, DOT } = require('./constants.js');
const newId = require('../../board/newId.js');

// One card per color: its label and what it does (Settings > Workflow).
function legendNodes(colorLabel) {
  const group = {
    id: newId(),
    type: 'group',
    label: 'How the colors work',
    x: -40,
    y: -80,
    width: COLUMN_WIDTH + 80,
    height: WORKFLOW.length * 100 + 100,
  };
  const cards = WORKFLOW.map(([name, meaning], index) => {
    const colorName = COLOR_NUM[name] ? name : 'uncolored';
    return {
      id: newId(),
      type: 'text',
      text: `${DOT[name]} **${colorLabel(name)}** (${colorName})\n${meaning}`,
      x: 0,
      y: index * 100,
      width: COLUMN_WIDTH,
      height: 80,
    };
  });
  return [group, ...cards];
}

module.exports = legendNodes;
