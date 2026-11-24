// The obsidian module for tests: the classes plugin code extends, and a
// stand-in (anything.js) for every other member.
const anything = require('./anything.js');
const Component = require('./Component.js');
const Plugin = require('./Plugin.js');

// Members read through stand-ins. Listed because `import * as obsidian`
// copies only the module's own keys.
const STAND_INS = ['Notice', 'Scope', 'Setting', 'setIcon'];

module.exports = new Proxy(
  {
    ...Object.fromEntries(STAND_INS.map((name) => [name, undefined])),
    Plugin,
    PluginSettingTab: Component,
    Modal: Component,
    FuzzySuggestModal: Component,
    AbstractInputSuggest: Component,
  },
  { get: (stubs, key) => stubs[key] || anything() },
);
module.exports.anything = anything;
