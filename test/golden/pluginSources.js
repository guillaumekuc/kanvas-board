const fileSystem = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const SKIPPED = new Set(['.git', 'node_modules', 'test', 'style', 'data.json']);

function pluginSources() {
  const entries = fileSystem
    .readdirSync(REPO)
    .filter((name) => !SKIPPED.has(name));

  return Object.fromEntries(
    entries.map((name) => [name, path.join(REPO, name)]),
  );
}

module.exports = pluginSources;
