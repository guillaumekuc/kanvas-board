const anything = require('./anything.js');
const Component = require('./Component.js');

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

module.exports = Plugin;
