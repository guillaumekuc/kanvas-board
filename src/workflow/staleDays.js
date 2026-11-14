const settings = require('./settings.js');

const staleDays = () => {
  const node = Number(settings().staleDays);
  return Number.isFinite(node) && settings().staleDays !== undefined ? node : 7;
}; // plugin setting "Stale after"

module.exports = staleDays;
