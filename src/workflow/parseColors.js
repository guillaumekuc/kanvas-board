const { COLORS } = require('../board/constants.js');

// "cyan purple" / "5,6" → Set of color numbers. Empty setting (all off): no go colors, the agent takes nothing.
function parseColors(s) {
  return new Set(
    String(s || '')
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((c) => COLORS[c.toLowerCase()] || c)
      .filter((c) => /^[1-6]$/.test(c)),
  );
}

module.exports = parseColors;
