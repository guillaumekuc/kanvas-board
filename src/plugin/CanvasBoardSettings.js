const { COLORS, COLOR_NUM, DEFAULTS, WORKFLOW } = require('./constants.js');
const { Notice, PluginSettingTab, Setting } = require('obsidian');
const fileSystem = require('fs');
const parseColors = require('./parseColors.js');
const path = require('path');

class CanvasBoardSettings extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    const text = (name, description, key) =>
      new Setting(containerEl)
        .setName(name)
        .setDesc(description)
        .addText((component) =>
          component
            .setPlaceholder(DEFAULTS[key])
            .setValue(this.plugin.settings[key])
            .onChange(async (value) => {
              this.plugin.settings[key] = value.trim() || DEFAULTS[key];
              await this.plugin.saveData(this.plugin.settings);
            }),
        );
    const heading = (name) =>
      new Setting(containerEl).setName(name).setHeading();
    new Setting(containerEl)
      .setName('Hotkeys')
      .setDesc(
        'Every canvas board command can have a key; buttons and menu items show it.',
      )
      .addButton((button) =>
        button.setButtonText('Open hotkeys').onClick(() => {
          this.app.setting.openTabById('hotkeys');
          const tab = this.app.setting.activeTab;
          if (tab && tab.searchComponent) {
            tab.searchComponent.setValue(this.plugin.manifest.name);
            if (tab.setQuery) tab.setQuery(this.plugin.manifest.name);
          }
        }),
      );
    heading('Board');
    new Setting(containerEl)
      .setName('Starter board')
      .setDesc(
        'A board with the color legend and first steps: the default board if it does not exist yet, else "Starter board.canvas".',
      )
      .addButton((button) =>
        button
          .setButtonText('Create')
          .onClick(() => this.plugin.createStarterBoard()),
      );
    text(
      'Default board',
      'Board used by "Run pass" when the active tab is not a canvas, and by "Open the board" (ribbon).',
      'defaultBoard',
    );
    text(
      'Card count warning',
      'The status bar card count turns to the warning color past this many cards (0: never).',
      'cardWarning',
    );
    text(
      'Stale after (days)',
      'A yellow card whose note is untouched this many days gets a warning badge with its age; the roll-up adds "· Nd" from the same value (0: never).',
      'staleDays',
    );
    text(
      'Agent notes folder',
      'Where the agent creates the notes and plan canvases for cards. Changing it does not move anything: rename the folder in Obsidian first, so links follow.',
      'notesFolder',
    );
    new Setting(containerEl)
      .setName('Archive')
      .setDesc(
        'Where "Archive selected cards" puts the notes: a "<board> archive" folder next to each board, or one folder for all boards. Changing it does not move notes already archived; restore works from any folder.',
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOption('board', 'Next to each board')
          .addOption('global', 'One folder for all boards')
          .setValue(this.plugin.settings.archiveMode)
          .onChange(async (value) => {
            this.plugin.settings.archiveMode = value;
            await this.plugin.saveData(this.plugin.settings);
            this.display();
          }),
      );
    if (this.plugin.settings.archiveMode === 'global') {
      text(
        'Archive folder',
        "The folder for all boards' archive notes.",
        'archiveFolder',
      );
    }
    heading('Workflow').setDesc(
      'What each color does and its label, shown in tooltips, the filter pane and the color commands. Toggle on: the color triggers the agent, so "Run pass" starts if the board has such a card and the agent takes those cards. All off: the agent never starts.',
    );
    const goColors = parseColors(this.plugin.settings.passColors);
    for (const [name, meaning] of WORKFLOW) {
      const colorNumber = COLOR_NUM[name];
      const row = new Setting(containerEl)
        .setName(colorNumber ? name : 'uncolored')
        .setDesc(meaning);
      row.nameEl.prepend(
        createSpan({
          cls: 'canvas-board-dot canvas-board-workflow-dot',
          attr: { style: this.plugin.dotStyle(colorNumber) },
        }),
      );
      row.addText((component) =>
        component
          .setPlaceholder(COLORS.find((color) => color[0] === name)[3])
          .setValue((this.plugin.settings.colorLabels || {})[name] || '')
          .onChange((value) => this.plugin.setColorLabel(name, value.trim())),
      );
      if (!colorNumber) {
        row.addToggle((component) =>
          component // uncolored never triggers the agent: same pill for the layout, locked
            .setTooltip('Never triggers the agent')
            .setValue(false)
            .setDisabled(true),
        );
      } else {
        row.addToggle((component) =>
          component
            .setTooltip('Triggers the agent')
            .setValue(goColors.has(colorNumber))
            .onChange(async (isOn) => {
              if (isOn) goColors.add(colorNumber);
              else goColors.delete(colorNumber);
              this.plugin.settings.passColors = WORKFLOW.map(
                ([colorName]) => colorName,
              )
                .filter((colorName) => goColors.has(COLOR_NUM[colorName]))
                .join(' ');
              await this.plugin.saveData(this.plugin.settings);
            }),
        );
      }
    }
    heading('Pass');
    text(
      'Claude path',
      'Empty: ~/.local/bin/claude (claude.exe on Windows) if it exists, else claude on PATH.',
      'claudePath',
    );
    text(
      'Terminal command',
      'Starts the pass. Empty: Windows Terminal, macOS Terminal, or the first known terminal on Linux (gnome-terminal, konsole, xfce4-terminal, kitty, alacritty, wezterm, foot, xterm). Otherwise {vault}, {board}, {claude} are replaced; quote parts with spaces.',
      'terminal',
    );
    // The instructions the agent follows on a pass, edited here; the file stays where Claude Code finds the skill.
    const skillFile = this.plugin.skillPath();
    new Setting(containerEl)
      .setName('Agent instructions')
      .setDesc(
        "What the agent does on a pass. Saved when the field loses focus, to .claude/skills/canvas-board/SKILL.md (where Claude Code reads it; any agent can be pointed at it). Written once from the plugin, then yours: plugin updates never overwrite it. Reset brings back the plugin's version.",
      )
      .addButton((button) =>
        button
          .setButtonText('Reset')
          .setWarning()
          .onClick(() => {
            this.plugin.resetSkill(
              path.join(
                this.app.vault.adapter.basePath,
                this.plugin.manifest.dir,
              ),
            );
            this.display();
          }),
      );
    const editor = containerEl.createEl('textarea', {
      cls: 'canvas-board-skill-editor',
      attr: { spellcheck: 'false', rows: '24' },
    });
    try {
      editor.value = fileSystem.readFileSync(skillFile, 'utf8');
    } catch (error) {
      editor.placeholder =
        "No instructions file yet: Reset writes the plugin's version.";
    }
    editor.addEventListener('change', () => {
      try {
        fileSystem.mkdirSync(path.dirname(skillFile), { recursive: true });
        fileSystem.writeFileSync(skillFile, editor.value);
        new Notice('Kanvas board: agent instructions saved');
      } catch (error) {
        new Notice(
          `Kanvas board: could not save the agent instructions (${error.message})`,
        );
      }
    });
    heading('APM counter').setDesc(
      'Canvas cards touched in a rolling window, in the status bar while a canvas is the active tab.',
    );
    const apm = this.plugin.apm;
    const apmSettings = apm.settings;
    new Setting(containerEl)
      .setName('Personal best')
      .setDesc(
        apmSettings.pb
          ? `${apmSettings.pb} cards in ${apmSettings.windowMinutes} min${apmSettings.pbDate ? `, set ${apmSettings.pbDate}` : ''}.`
          : 'None yet.',
      )
      .addButton((button) =>
        button
          .setButtonText('Reset')
          .setWarning()
          .onClick(async () => {
            await apm.resetPb();
            this.display();
          }),
      );
    new Setting(containerEl)
      .setName('Window (minutes)')
      .setDesc(
        'Cards are counted over this rolling window. Changing it resets the personal best: the numbers are not comparable.',
      )
      .addText((component) => {
        component.setValue(String(apmSettings.windowMinutes));
        component.inputEl.addEventListener('change', async () => {
          const minutes = Number(component.getValue());
          if (!(minutes > 0) || minutes === apmSettings.windowMinutes) return;
          await apm.setWindow(minutes);
          this.display();
        });
      });
    new Setting(containerEl)
      .setName('Alert below')
      .setDesc(
        'Percent of the personal best under which the counter turns red and pulses. Not in the first window of a session.',
      )
      .addSlider((slider) =>
        slider
          .setLimits(5, 50, 5)
          .setValue(apmSettings.lowPercent)
          .setDynamicTooltip()
          .onChange(async (value) => {
            apmSettings.lowPercent = value;
            await this.plugin.saveData(this.plugin.settings);
            apm.refresh();
          }),
      );
    new Setting(containerEl)
      .setName('Idle after (minutes)')
      .setDesc(
        'Without an action for this long, the alert stops and the counter dims. It also dims while Obsidian is not focused.',
      )
      .addText((component) =>
        component
          .setValue(String(apmSettings.idleMinutes))
          .onChange(async (value) => {
            const minutes = Number(value);
            if (!(minutes > 0)) return;
            apmSettings.idleMinutes = minutes;
            await this.plugin.saveData(this.plugin.settings);
            apm.refresh();
          }),
      );
    heading('Layout');
    new Setting(containerEl)
      .setName('Layout direction')
      .setDesc(
        'Tidy layout and agent-made plan canvases: the card a branch starts from comes first, following arrows in the fold direction ("depends on" prerequisites too). Shift-click the Tidy layout button, or commands "Tidy layout direction: …", switch it on the fly.',
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            TB: 'Top to bottom',
            LR: 'Left to right',
            BT: 'Bottom to top',
            RL: 'Right to left',
          })
          .setValue(this.plugin.settings.layoutDirection)
          .onChange((value) => this.plugin.setLayoutDirection(value)),
      );
    heading('View');
    new Setting(containerEl)
      .setName('Fold direction')
      .setDesc(
        'Fold branch hides the cards the card points to (outgoing) or the cards pointing to it (incoming), and so on down the branch. Tidy layout reads branches the same way. Commands "Fold direction: …" switch it on the fly.',
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({ out: 'Outgoing', in: 'Incoming' })
          .setValue(this.plugin.settings.foldDirection)
          .onChange(async (value) => {
            this.plugin.settings.foldDirection = value;
            await this.plugin.saveData(this.plugin.settings);
          }),
      );
    new Setting(containerEl)
      .setName('Hide cards under hidden tags')
      .setDesc(
        'Hiding a tag in the filter pane also hides the branch of each card that has it, in the fold direction.',
      )
      .addToggle((component) =>
        component
          .setValue(this.plugin.settings.hideTagBranches)
          .onChange(async (value) => {
            this.plugin.settings.hideTagBranches = value;
            await this.plugin.saveData(this.plugin.settings);
            for (const canvas of this.plugin.panes.keys()) {
              this.plugin.refreshView(canvas);
            }
          }),
      );
  }
}

module.exports = CanvasBoardSettings;
