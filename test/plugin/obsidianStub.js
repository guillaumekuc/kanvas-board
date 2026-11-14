// A stand-in for the obsidian module: every unknown member is a callable
// that returns another stand-in, so plugin code runs without the app.
const anything = () => {
  const assigned = new Map();
  return new Proxy(function stub() {}, {
    set: (target, key, value) => assigned.set(key, value),
    get: (target, key) => {
      if (assigned.has(key)) return assigned.get(key);
      if (key === Symbol.toPrimitive) return () => '';
      if (key === 'then') return undefined;
      if (key === Symbol.iterator) return [][Symbol.iterator].bind([]);
      if (key === 'length') return 0;
      return anything();
    },
    apply: () => anything(),
    construct: () => anything(),
  });
};

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

class Plugin extends Component {
  constructor(app, manifest) {
    super(app);
    this.manifest = manifest;
    this.recorded = { commands: [], ribbonIcons: [], settingTabs: [] };
  }

  addCommand(command) {
    this.recorded.commands.push(`${command.id}: ${command.name}`);
    return command;
  }

  addRibbonIcon(icon, title) {
    this.recorded.ribbonIcons.push(`${icon}: ${title}`);
    return anything();
  }

  addSettingTab(tab) {
    this.recorded.settingTabs.push(tab);
  }

  addStatusBarItem() {
    return anything();
  }

  async loadData() {
    return {};
  }

  async saveData() {}
}

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
