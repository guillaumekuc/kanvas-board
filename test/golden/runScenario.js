const fileSystem = require('fs');
const operatingSystem = require('os');
const path = require('path');
const pluginSources = require('./pluginSources.js');
const readTree = require('./readTree.js');
const runCommand = require('./runCommand.js');
const writeFixture = require('./fixture.js');

function runScenario(commands) {
  const vaultRoot = fileSystem.mkdtempSync(
    path.join(operatingSystem.tmpdir(), 'kanvas-golden-'),
  );
  writeFixture(vaultRoot, pluginSources());
  const outputs = commands.map((commandArguments) =>
    runCommand(vaultRoot, commandArguments),
  );
  const anonymized = JSON.parse(
    JSON.stringify(outputs)
      .split(JSON.stringify(vaultRoot).slice(1, -1))
      .join('<vault>'),
  );
  const files = readTree(vaultRoot);
  fileSystem.rmSync(vaultRoot, { recursive: true, force: true });
  return { outputs: anonymized, files };
}

module.exports = runScenario;
