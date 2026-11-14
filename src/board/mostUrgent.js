const { URGENCY } = require('./constants.js');

function mostUrgent(colors) {
  return URGENCY.find((color) => colors.includes(color)) || '';
}

module.exports = mostUrgent;
