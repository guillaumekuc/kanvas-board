const anything = require('./anything.js');

class Component {
  constructor(app, plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = anything();
  }

  register() {}

  registerEvent() {}

  registerDomEvent() {}

  registerInterval() {}
}

module.exports = Component;
