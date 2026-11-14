const { COLORS } = require('../board/constants.js');

// "cyan purple" / "5,6" → Set of color numbers. Empty setting (all off): no go
// colors, the agent takes nothing.
function parseColors(value) {
  return new Set(
    String(value || '')
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((color) => COLORS[color.toLowerCase()] || color)
      .filter((color) => /^[1-6]$/.test(color)),
  );
}

module.exports = parseColors;
