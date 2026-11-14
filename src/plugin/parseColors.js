const { COLOR_NUM } = require('./constants.js');

const parseColors = s => new Set(String(s || '').split(/[\s,]+/).filter(Boolean).map(c => COLOR_NUM[c.toLowerCase()] || c).filter(c => /^[1-6]$/.test(c)));

module.exports = parseColors;
