const { COLORS } = require('./constants.js');

const colorArg = (color) =>
  color === undefined
    ? undefined
    : color === 'none'
      ? ''
      : COLORS[color] || color;

module.exports = colorArg;
