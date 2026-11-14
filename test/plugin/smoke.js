// node test/plugin/smoke.js [pluginDir]: copies the plugin into a temporary
// vault, loads it with Obsidian stubbed, runs onload and the settings screen,
// prints what it registered.
const fs = require('fs');
const os = require('os');
const Module = require('module');
const path = require('path');
const stub = require('./obsidianStub.js');

const PLUGIN_FILES = ['main.js', 'canvas.js', 'apm.js', 'workflow.js', 'dagre.min.js', 'skill'];
const sourceDir = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const vaultRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kanvas-smoke-'));
const pluginDir = path.join(vaultRoot, '.obsidian', 'plugins', 'canvas-board');
fs.mkdirSync(pluginDir, { recursive: true });
for (const name of PLUGIN_FILES) {
  const source = path.join(sourceDir, name);
  if (fs.existsSync(source)) fs.cpSync(source, path.join(pluginDir, name), { recursive: true });
}
const mainFile = path.join(pluginDir, 'main.js');
const resolve = Module._resolveFilename;
Module._resolveFilename = function resolveStub(request, ...rest) {
  if (request === 'obsidian') return require.resolve('./obsidianStub.js');
  return resolve.call(this, request, ...rest);
};
global.window = { require, setInterval: () => 0, clearInterval: () => {}, setTimeout: () => 0, clearTimeout: () => {} };
global.document = stub.anything();
global.activeDocument = global.document;
global.createSpan = stub.anything;
global.createDiv = stub.anything;
global.createEl = stub.anything;
global.createFragment = stub.anything;

async function main() {
  const PluginClass = require(mainFile);
  const app = stub.anything();
  app.vault = stub.anything();
  app.vault.adapter = { basePath: path.resolve(pluginDir, '..', '..', '..') };
  const manifest = { id: 'canvas-board', dir: path.relative(app.vault.adapter.basePath, pluginDir) };
  const plugin = new PluginClass(app, manifest);
  await plugin.onload();
  for (const tab of plugin.recorded.settingTabs) tab.display();
  const report = {
    commands: plugin.recorded.commands.sort(),
    ribbonIcons: plugin.recorded.ribbonIcons,
    api: Object.keys(plugin.api || {}).sort(),
    settings: Object.keys(plugin.settings).sort(),
  };
  console.log(JSON.stringify(report, null, 2));
  fs.rmSync(vaultRoot, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
