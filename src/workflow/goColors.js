const { DEFAULT_PASS_COLORS } = require('./constants.js');
const parseColors = require('./parseColors.js');
const settings = require('./settings.js');

function goColors() {
  const s = settings().passColors;
  return parseColors(s === undefined ? DEFAULT_PASS_COLORS : s);
}

module.exports = goColors;
