// The obsidian module for tests: the classes plugin code extends, and a
// stand-in (anything.js) for every other member.
const anything = require('./anything.js');
const Component = require('./Component.js');
const Plugin = require('./Plugin.js');

module.exports = new Proxy(
  {
    Plugin,
    PluginSettingTab: Component,
    Modal: Component,
    FuzzySuggestModal: Component,
    AbstractInputSuggest: Component,
  },
  { get: (stubs, key) => stubs[key] || anything() },
);
module.exports.anything = anything;
