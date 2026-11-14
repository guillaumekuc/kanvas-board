const settings = require('./settings.js');

function staleDays() {
  const days = Number(settings().staleDays);
  return Number.isFinite(days) && settings().staleDays !== undefined ? days : 7;
} // plugin setting "Stale after"

module.exports = staleDays;
