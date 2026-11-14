const { COLORS } = require('./constants.js');

function colorArg(color) {
  return color === undefined
    ? undefined
    : color === 'none'
      ? ''
      : COLORS[color] || color;
}

module.exports = colorArg;
