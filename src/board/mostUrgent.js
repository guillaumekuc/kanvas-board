const { URGENCY } = require('./constants.js');

const mostUrgent = (colors) =>
  URGENCY.find((color) => colors.includes(color)) || '';

module.exports = mostUrgent;
