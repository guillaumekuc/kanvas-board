const { URGENCY } = require('./constants.js');

const mostUrgent = colors => URGENCY.find(c => colors.includes(c)) || '';

module.exports = mostUrgent;
