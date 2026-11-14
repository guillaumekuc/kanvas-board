const { DEFAULTS } = require('./constants.js');
const unitOf = require('./unitOf.js');

// The settings live under `apm` in the plugin's data.json. First load: taken
// over from the old apm-counter plugin's file, if any.
function loadSettings(stored, legacy) {
  const settings = Object.assign({}, DEFAULTS, stored || legacy || {});
  if (settings.unit !== unitOf(settings.windowMinutes)) {
    Object.assign(settings, {
      pb: 0,
      pbDate: '',
      unit: unitOf(settings.windowMinutes),
    });
  }
  return settings;
}

module.exports = loadSettings;
