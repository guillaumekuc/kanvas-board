const { COLOR_NUM } = require('./constants.js');

const parseColors = (value) =>
  new Set(
    String(value || '')
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((color) => COLOR_NUM[color.toLowerCase()] || color)
      .filter((color) => /^[1-6]$/.test(color)),
  );

module.exports = parseColors;
