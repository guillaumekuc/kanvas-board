const fileSystem = require('fs');
const path = require('path');

// The APM counter was once its own plugin: its settings, if it was installed.
function legacyApmSettings(pluginDir) {
  const file = path.join(pluginDir, '..', 'apm-counter', 'data.json');
  try {
    return JSON.parse(fileSystem.readFileSync(file, 'utf8'));
  } catch {
    return undefined;
  }
}

module.exports = legacyApmSettings;
