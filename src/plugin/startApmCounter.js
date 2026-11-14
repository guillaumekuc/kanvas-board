const ApmCounter = require('../apm/ApmCounter.js');
const legacyApmSettings = require('./legacyApmSettings.js');
const loadSettings = require('../apm/loadSettings.js');

function startApmCounter(plugin, pluginDir) {
  const { settings } = plugin;
  const legacy = settings.apm ? undefined : legacyApmSettings(pluginDir);
  settings.apm = loadSettings(settings.apm, legacy);
  const apm = new ApmCounter(plugin, settings.apm, () =>
    plugin.saveData(settings),
  );
  apm.load();
  plugin.register(() => apm.unload());
  return apm;
}

module.exports = startApmCounter;
