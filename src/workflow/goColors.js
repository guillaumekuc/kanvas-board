const { DEFAULT_PASS_COLORS } = require('./constants.js');
const parseColors = require('./parseColors.js');
const settings = require('./settings.js');

function goColors() {
  const value = settings().passColors;
  return parseColors(value === undefined ? DEFAULT_PASS_COLORS : value);
}

module.exports = goColors;
