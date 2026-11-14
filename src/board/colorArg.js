const { COLORS } = require('./constants.js');

// --- Commands -----------------------------------------------------------------------------------------

const colorArg = c => (c === undefined ? undefined : c === 'none' ? '' : COLORS[c] || c);

module.exports = colorArg;
