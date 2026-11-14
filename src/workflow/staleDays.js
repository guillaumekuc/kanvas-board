const settings = require('./settings.js');

const staleDays = () => {
  const n = Number(settings().staleDays);
  return Number.isFinite(n) && settings().staleDays !== undefined ? n : 7;
}; // plugin setting "Stale after"

module.exports = staleDays;
