// node test/golden/run.js [--update]: runs canvas.js commands on a synthetic
// vault and compares output and resulting files with golden.json.
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { isDeepStrictEqual } = require('util');
const { spawnSync } = require('child_process');
const writeFixture = require('./fixture.js');
const SCENARIOS = require('./scenarios.js');

const REPO = path.resolve(__dirname, '..', '..');
const SKIPPED = new Set(['.git', 'node_modules', 'test', 'style', 'data.json']);
const GOLDEN = path.join(__dirname, 'golden.json');

function pluginSources() {
  const entries = fs.readdirSync(REPO).filter((name) => !SKIPPED.has(name));
  return Object.fromEntries(entries.map((name) => [name, path.join(REPO, name)]));
}

function readTree(root, directory = '') {
  const snapshot = {};
  for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
    const relativePath = path.posix.join(directory, entry.name);
    if (relativePath === '.obsidian') continue;
    if (entry.isDirectory()) Object.assign(snapshot, readTree(root, relativePath));
    else snapshot[relativePath] = fs.readFileSync(path.join(root, relativePath), 'utf8');
  }
  return snapshot;
}

function runCommand(vaultRoot, commandArgs) {
  const script = path.join(vaultRoot, '.obsidian', 'plugins', 'canvas-board', 'canvas.js');
  const preload = path.join(__dirname, 'preload.js');
  const result = spawnSync(process.execPath, ['-r', preload, script, ...commandArgs], { cwd: vaultRoot, encoding: 'utf8' });
  const errors = result.stderr.split('\n')
    .map((line) => line.trim())
    .filter((line) => /^(\w*Error|Usage)/.test(line));
  return { args: commandArgs.join(' '), status: result.status, stdout: result.stdout, errors };
}

function runScenario(commands) {
  const vaultRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kanvas-golden-'));
  writeFixture(vaultRoot, pluginSources());
  const outputs = commands.map((commandArgs) => runCommand(vaultRoot, commandArgs));
  const anonymized = JSON.parse(JSON.stringify(outputs).split(JSON.stringify(vaultRoot).slice(1, -1)).join('<vault>'));
  const files = readTree(vaultRoot);
  fs.rmSync(vaultRoot, { recursive: true, force: true });
  return { outputs: anonymized, files };
}

const actual = Object.fromEntries(Object.entries(SCENARIOS).map(([name, commands]) => [name, runScenario(commands)]));
if (process.argv.includes('--update')) {
  fs.writeFileSync(GOLDEN, JSON.stringify(actual, null, 2));
  console.log(`golden: ${Object.keys(actual).length} scenarios written`);
} else {
  const expected = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
  const failed = Object.keys(expected).filter((name) => !isDeepStrictEqual(actual[name], expected[name]));
  for (const name of failed) {
    fs.writeFileSync(path.join(os.tmpdir(), `kanvas-golden-${name}.json`), JSON.stringify(actual[name], null, 2));
  }
  assert.deepStrictEqual(failed, [], `actual output in ${os.tmpdir()}/kanvas-golden-<scenario>.json`);
  console.log(`golden: ${Object.keys(expected).length} scenarios match`);
}
