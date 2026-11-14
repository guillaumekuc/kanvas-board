const { DEFAULTS } = require('./constants.js');
const unitOf = require('./unitOf.js');

// The settings live under `apm` in the plugin's data.json. First load: taken over from the old apm-counter plugin's file, if any.
function loadSettings(stored, legacy) {
  const s = Object.assign({}, DEFAULTS, stored || legacy || {});
  if (s.unit !== unitOf(s.windowMinutes)) {Object.assign(s, { pb: 0, pbDate: '', unit: unitOf(s.windowMinutes) });}
  return s;
}

module.exports = loadSettings;
