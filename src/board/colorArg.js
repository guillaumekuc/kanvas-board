const { COLORS } = require('./constants.js');

// --- Commands -----------------------------------------------------------------------------------------

const colorArg = (color) =>
  color === undefined
    ? undefined
    : color === 'none'
      ? ''
      : COLORS[color] || color;

module.exports = colorArg;
