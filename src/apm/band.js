const { MIN_PB } = require('./constants.js');

function band(pace, { personalBest, lowPercent, isWarmingUp = false }) {
  if (personalBest < MIN_PB) return 'calibrating';
  if (pace >= personalBest) return 'best';
  const ratio = (pace / personalBest) * 100;
  // a session's first window can't be full yet: no alert
  if (ratio < lowPercent) return isWarmingUp ? 'calibrating' : 'low';
  if (ratio < 50) return 'orange';
  if (ratio < 75) return 'yellow';
  return 'green';
}

module.exports = band;
