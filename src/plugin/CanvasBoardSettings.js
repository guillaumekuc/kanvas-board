import * as shared from './shared.js';
import * as obsidian from 'obsidian';
import fileSystem from 'fs';
import * as agentInstructions from './agentInstructions.js';
import * as config from '../workflow/config.js';
import path from 'path';

function fitToText(field) {
  field.style.height = 'auto';
  field.style.height = `${field.scrollHeight + 2}px`;
}

class CanvasBoardSettings extends obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    this.plugin.applyTheme(this.containerEl.ownerDocument);
    this.containerEl.empty();
    this.skillFields = { general: null, colors: {} };
    this.displayHotkeys();
    this.displayBoard();
    this.displayWorkflow();
    this.displayPass();
    this.displayApm();
    this.displayLayoutAndView();
  }

  // Re-render after a change without jumping back to the top of the tab.
  // The tab or its container scrolls, depending on the Obsidian version.
  redisplay() {
    const scrollers = [this.containerEl, this.containerEl.parentElement]
      .filter(Boolean)
      .map((element) => [element, element.scrollTop]);
    this.display();
    for (const [element, scrollTop] of scrollers) {
      element.scrollTop = scrollTop;
    }
  }

  addTextSetting(name, description, key) {
    return new obsidian.Setting(this.containerEl)
      .setName(name)
      .setDesc(description)
      .addText((component) =>
        component
          .setPlaceholder(shared.DEFAULTS[key])
          .setValue(this.plugin.settings[key])
          .onChange(async (value) => {
            this.plugin.settings[key] = value.trim() || shared.DEFAULTS[key];
            await this.plugin.saveData(this.plugin.settings);
          }),
      );
  }

  addHeading(name) {
    return new obsidian.Setting(this.containerEl).setName(name).setHeading();
  }

  displayHotkeys() {
    const { containerEl } = this;
    new obsidian.Setting(containerEl)
      .setName('Hotkeys')
      .setDesc(
        'Every canvas board command can have a key; buttons and menu ' +
          'items show it.',
      )
      .addButton((button) =>
        button.setButtonText('Open hotkeys').onClick(() => {
          this.app.setting.openTabById('hotkeys');
          const tab = this.app.setting.activeTab;
          if (tab && tab.searchComponent) {
            tab.searchComponent.setValue(this.plugin.manifest.name);
            if (tab.setQuery) {
              tab.setQuery(this.plugin.manifest.name);
            }
          }
        }),
      );
  }

  displayBoard() {
    const { containerEl } = this;
    this.addHeading('Board');
    new obsidian.Setting(containerEl)
      .setName('Starter board')
      .setDesc(
        'A board with the color legend and first steps: the default ' +
          'board if it does not exist yet, else "Starter board.canvas".',
      )
      .addButton((button) =>
        button
          .setButtonText('Create')
          .onClick(() => this.plugin.createStarterBoard()),
      );
    this.addTextSetting(
      'Default board',
      'Board used by "Run pass" when the active tab is not a ' +
        'canvas, and by "Open the board" (ribbon).',
      'defaultBoard',
    );
    this.addTextSetting(
      'Card count warning',
      'The status bar card count turns to the warning color past ' +
        'this many cards (0: never).',
      'cardWarning',
    );
    this.addTextSetting(
      'Stale after (days)',
      'A yellow card whose note is untouched this many days gets a ' +
        'warning badge with its age; the roll-up adds "· Nd" from the ' +
        'same value (0: never).',
      'staleDays',
    );
    this.addTextSetting(
      'Agent notes folder',
      'Where the agent creates the notes and plan canvases for ' +
        'cards. Changing it does not move anything: rename the folder ' +
        'in Obsidian first, so links follow.',
      'notesFolder',
    );
    this.displayArchive();
  }

  displayArchive() {
    const { containerEl } = this;
    new obsidian.Setting(containerEl)
      .setName('Archive')
      .setDesc(
        'Where "Archive selected cards" puts the notes: a "<board> ' +
          'archive" folder next to each board, or one folder for all ' +
          'boards. Changing it does not move notes already archived; ' +
          'restore works from any folder.',
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOption('board', 'Next to each board')
          .addOption('global', 'One folder for all boards')
          .setValue(this.plugin.settings.archiveMode)
          .onChange(async (value) => {
            this.plugin.settings.archiveMode = value;
            await this.plugin.saveData(this.plugin.settings);
            this.redisplay();
          }),
      );
    if (this.plugin.settings.archiveMode === 'global') {
      this.addTextSetting(
        'Archive folder',
        "The folder for all boards' archive notes.",
        'archiveFolder',
      );
    }
  }

  displayWorkflow() {
    const { containerEl } = this;
    this.addHeading('Workflow').setDesc(
      'Six roles, each with its rules in the plugin and its canvas color ' +
        'slot for good (the number cards store, the Alt+N hotkey): click ' +
        'a dot to pick the color the slot shows, a preset or a custom ' +
        'one (every canvas and the canvas color picker follow), and, ' +
        'under it, its part of the agent instructions. Do and Plan cards ' +
        'start the agent: "Run pass" starts if the board has one, and ' +
        'the agent takes those cards.',
    );
    this.displayAgentInstructions();
    const instructions = this.readSkillParts();
    this.addGeneralSkillField();
    const workflow = config.resolve(this.plugin.settings);
    for (const { role, name, meaning } of this.rows) {
      const colorNumber = shared.COLOR_NUM[name];
      const row = new obsidian.Setting(containerEl)
        .setName(role ? config.roleInfo(role).label : 'Uncolored')
        .setDesc(meaning);
      const dot = createSpan({
        cls: 'kanvas-board-dot kanvas-board-workflow-dot',
        attr: { style: this.plugin.dotStyle(colorNumber) },
      });
      row.nameEl.prepend(dot);
      if (role) {
        this.makeColorPicker(dot, role);
      }
      this.skillFields.colors[name] = this.addSkillField(
        instructions.colors[name],
        `Agent instructions: ${agentInstructions.sectionTitle(name)}`,
      );
    }
    this.watchSkillFields(this.plugin.skillPath());
    this.displayWorkflowRules(workflow);
  }

  // A role's dot opens a row of color pastilles under it; the role's rules
  // stay.
  makeColorPicker(dot, role) {
    dot.addClass('kanvas-board-color-picker');
    dot.setAttr('aria-label', 'Pick a color for this role');
    dot.addEventListener('click', (event) => {
      event.stopPropagation();
      this.openPastilles(dot, role);
    });
  }

  // The popover lives in the dot's own window: Settings may open in a popout
  // window, and a popover in the main one shows far away, misses outside
  // clicks there and, once clicked, takes the focus and closes Settings.
  openPastilles(dot, role) {
    this.closePastilles();
    const ownerDoc = dot.ownerDocument;
    const { colors } = config.resolve(this.plugin.settings);
    const popover = ownerDoc.body.createDiv({
      cls: 'kanvas-board-pastilles',
    });
    // The presets in Obsidian's own colors (the slots may show others).
    for (const { name, canvasColor } of shared.COLORS) {
      if (!canvasColor) {
        continue;
      }
      const pastille = popover.createDiv({
        cls: 'kanvas-board-swatch',
        attr: { 'aria-label': name },
      });
      pastille.toggleClass('is-active', colors[role] === name);
      pastille.createSpan({
        cls: 'kanvas-board-dot',
        attr: { style: `background: var(--color-${name})` },
      });
      pastille.addEventListener('click', () => {
        this.closePastilles();
        this.setRoleColor(role, name);
      });
    }
    this.addCustomPastille(popover, role, colors[role]);
    placeBelow(popover, dot);
    // Outside pointerdown or Escape closes the popover only: Escape is
    // consumed so the Settings window stays open.
    function close(event) {
      if (event.type === 'keydown') {
        if (event.key !== 'Escape') {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
      } else if (popover.contains(event.target)) {
        return;
      }
      this.closePastilles();
    }
    const listener = close.bind(this);
    ownerDoc.addEventListener('pointerdown', listener, true);
    ownerDoc.addEventListener('keydown', listener, true);
    this.pastilles = {
      popover,
      unlisten() {
        ownerDoc.removeEventListener('pointerdown', listener, true);
        ownerDoc.removeEventListener('keydown', listener, true);
      },
    };
  }

  closePastilles() {
    if (!this.pastilles) {
      return;
    }

    this.pastilles.unlisten();
    this.pastilles.popover.remove();
    this.pastilles = null;
  }

  hide() {
    this.closePastilles();
    super.hide();
  }

  // The last pastille: the native color input, for any color. Active when
  // the role shows a custom one.
  addCustomPastille(popover, role, current) {
    const isCustom = current.startsWith('#');
    const pastille = popover.createEl('label', {
      cls: 'kanvas-board-swatch kanvas-board-custom-color',
      attr: { 'aria-label': 'Custom color' },
    });
    pastille.toggleClass('is-active', isCustom);
    const input = pastille.createEl('input', {
      type: 'color',
      value: isCustom && current.length === 7 ? current : '#888888',
    });
    input.addEventListener('change', () => {
      this.closePastilles();
      this.setRoleColor(role, input.value);
    });
  }

  // The color a role's slot shows (a preset name or a hex). Cards, labels,
  // instructions stay with the slot.
  async setRoleColor(role, theme) {
    const { colors } = config.resolve(this.plugin.settings);
    if (colors[role] === theme) {
      return;
    }

    await this.saveWorkflow({ colors: { ...colors, [role]: theme } });
    this.redisplay();
  }

  async saveWorkflow(change) {
    const settings = this.plugin.settings;
    settings.workflow = { ...(settings.workflow || {}), ...change };
    await this.plugin.saveData(settings);
    this.plugin.applyTheme();
  }

  // The templates: the notes that set the shapes of agent-written cards and
  // plan notes.
  displayWorkflowRules(workflow) {
    const { containerEl } = this;
    this.addTemplateSetting(workflow, {
      key: 'cardTemplate',
      name: 'Card template',
      description:
        'A note listing the shapes of the card text agents write, one per ' +
        'line ({word}: any text). Check holds agent-written cards to it.',
    });
    this.addTemplateSetting(workflow, {
      key: 'noteTemplate',
      name: 'Plan note template',
      description:
        'A note with the frontmatter keys and headings of the notes ' +
        'agents write. Check holds those notes to it.',
    });
    this.addTemplateSetting(workflow, {
      key: 'instructions',
      name: 'Agent instructions note',
      description:
        'The note holding the agent instructions (the fields above edit ' +
        'it too); Run pass gives the agent a copy with the placeholders ' +
        'filled in.',
    });
    new obsidian.Setting(containerEl)
      .setName('Reset workflow')
      .setDesc(
        "The roles' colors and the template paths back to the defaults. " +
          'Labels, the template notes and the agent instructions are kept.',
      )
      .addButton((button) =>
        button
          .setButtonText('Reset')
          .setWarning()
          .onClick(async () => {
            delete this.plugin.settings.workflow;
            await this.plugin.saveData(this.plugin.settings);
            this.plugin.applyTheme();
            this.redisplay();
          }),
      );
  }

  addTemplateSetting(workflow, { key, name, description }) {
    new obsidian.Setting(this.containerEl)
      .setName(name)
      .setDesc(
        `${description} Written from the plugin's default when missing; ` +
          'the agent instructions name it as {' +
          key +
          '}.',
      )
      .addText((component) =>
        component
          .setPlaceholder(workflow[key])
          .setValue((this.plugin.settings.workflow || {})[key] || '')
          .onChange(async (value) => {
            await this.saveWorkflow({ [key]: value.trim() });
            this.plugin.installTemplates();
            this.plugin.installSkill(this.pluginDir());
          }),
      );
  }

  // The general instructions and Reset, at the top of Workflow.
  displayAgentInstructions() {
    const { containerEl } = this;
    // The instructions the agent follows on a pass, edited here; the pass
    // prompt points the agent at the file. The general part and its Reset
    // come first, then each color's part under its row.
    new obsidian.Setting(containerEl)
      .setName('Agent instructions')
      .setDesc(
        'What the agent does on a pass: the general part below, then ' +
          'one part per color, under each color (the agent reads them ' +
          'all; it works the Do and Plan cards). Saved when a ' +
          `field loses focus, to ${this.plugin.skillRelativePath()} (the ` +
          'pass prompt points any agent at it). Written once from the ' +
          'plugin, then yours: plugin updates never overwrite it. ' +
          "Reset brings back the plugin's version.",
      )
      .addButton((button) =>
        button
          .setButtonText('Reset')
          .setWarning()
          .onClick(() => {
            this.plugin.resetSkill(this.pluginDir());
            this.redisplay();
          }),
      );
  }

  pluginDir() {
    return path.join(this.app.vault.adapter.basePath, this.plugin.manifest.dir);
  }

  displayPass() {
    const { containerEl } = this;
    this.addHeading('Pass');
    this.addTextSetting(
      'Agent command',
      'The agent CLI that runs the pass, e.g. codex, gemini -i ' +
        '{prompt}, opencode --prompt {prompt}. {prompt} is replaced by ' +
        'the pass prompt, else it goes last. Empty: Claude Code ' +
        '(~/.local/bin/claude if it exists, else claude on PATH).',
      'agentCommand',
    );
    this.addTextSetting(
      'Terminal command',
      'Starts the pass. Empty: Windows Terminal, macOS Terminal, or ' +
        'the first known terminal on Linux (gnome-terminal, konsole, ' +
        'xfce4-terminal, kitty, alacritty, wezterm, foot, xterm). ' +
        'Otherwise {vault} and {board} are replaced and {agent} ' +
        'becomes the agent command with its prompt; quote parts with ' +
        'spaces.',
      'terminal',
    );
  }

  // The skill file split into its general part and one part per color
  // (see agentInstructions.js); read once per display.
  readSkillParts() {
    this.rows = shared.workflowRows(this.plugin.settings);
    const colorNames = this.rowColorNames();
    this.skillText = this.readSkill(this.plugin.skillPath());
    this.skillParts = agentInstructions.splitInstructions(
      this.skillText,
      colorNames,
    );

    return this.skillParts;
  }

  // The colors in the Workflow rows' order (the roles', uncolored last).
  rowColorNames() {
    return shared.workflowRows(this.plugin.settings).map(({ name }) => name);
  }

  // The general field, at the top of Workflow before the color rows.
  addGeneralSkillField() {
    const general = this.addSkillField(
      this.skillParts.general,
      'Agent instructions',
    );
    if (this.skillText === null) {
      general.placeholder =
        "No instructions file yet: Reset writes the plugin's version.";
    }
    this.skillFields.general = general;
  }

  // Any instructions field (general or a color's) saves the whole file.
  watchSkillFields(skillFile) {
    const colorNames = this.rowColorNames();
    const general = this.skillFields.general;
    const colorFields = this.skillFields.colors;
    const fields = [general, ...Object.values(colorFields)];
    for (const field of fields) {
      field.addEventListener('change', () => {
        const colors = {};
        for (const colorName of colorNames) {
          colors[colorName] = colorFields[colorName].value;
        }
        const joined = agentInstructions.joinInstructions(
          { general: general.value, colors },
          colorNames,
        );
        this.saveSkill(skillFile, joined);
      });
    }
  }

  readSkill(skillFile) {
    try {
      return fileSystem.readFileSync(skillFile, 'utf8');
    } catch (error) {
      return null;
    }
  }

  // A textarea as tall as its text: it grows and shrinks while typing.
  addSkillField(value, label) {
    const field = this.containerEl.createEl('textarea', {
      cls: 'kanvas-board-skill-editor',
      attr: { spellcheck: 'false', rows: '1', 'aria-label': label },
    });
    field.value = value;
    field.addEventListener('input', () => fitToText(field));
    // scrollHeight is 0 until the tab is laid out
    window.setTimeout(() => fitToText(field), 0);

    return field;
  }

  saveSkill(skillFile, text) {
    try {
      fileSystem.mkdirSync(path.dirname(skillFile), { recursive: true });
      fileSystem.writeFileSync(skillFile, text);
      new obsidian.Notice('Kanvas board: agent instructions saved');
    } catch (error) {
      new obsidian.Notice(
        `Kanvas board: could not save the agent instructions ` +
          `(${error.message})`,
      );
    }
  }

  displayApm() {
    const { containerEl } = this;
    this.addHeading('APM counter').setDesc(
      'Canvas cards touched in a rolling window, in the status bar ' +
        'while a canvas is the active tab.',
    );
    const apm = this.plugin.apm;
    const apmSettings = apm.settings;
    new obsidian.Setting(containerEl)
      .setName('Show APM counter')
      .setDesc('Off: hidden and not counting. The personal best is kept.')
      .addToggle((toggle) =>
        toggle.setValue(apmSettings.enabled).onChange(async (value) => {
          await apm.setEnabled(value);
          this.redisplay();
        }),
      );
    // the detailed settings only matter while the counter is on
    if (!apmSettings.enabled) {
      return;
    }
    new obsidian.Setting(containerEl)
      .setName('Personal best')
      .setDesc(
        apmSettings.pb
          ? `${apmSettings.pb} cards in ${apmSettings.windowMinutes} ` +
              `min${apmSettings.pbDate ? `, set ${apmSettings.pbDate}` : ''}.`
          : 'None yet.',
      )
      .addButton((button) =>
        button
          .setButtonText('Reset')
          .setWarning()
          .onClick(async () => {
            await apm.resetPb();
            this.redisplay();
          }),
      );
    new obsidian.Setting(containerEl)
      .setName('Window (minutes)')
      .setDesc(
        'Cards are counted over this rolling window. Changing it ' +
          'resets the personal best: the numbers are not comparable.',
      )
      .addText((component) => {
        component.setValue(String(apmSettings.windowMinutes));
        component.inputEl.addEventListener('change', async () => {
          const minutes = Number(component.getValue());
          if (!(minutes > 0) || minutes === apmSettings.windowMinutes) {
            return;
          }
          await apm.setWindow(minutes);
          this.redisplay();
        });
      });
    this.displayApmTimes();
  }

  displayApmTimes() {
    const { containerEl } = this;
    const apm = this.plugin.apm;
    const apmSettings = apm.settings;
    new obsidian.Setting(containerEl)
      .setName('Alert below')
      .setDesc(
        'Percent of the personal best under which the counter turns ' +
          'red and pulses. Not in the first window of a session.',
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
    new obsidian.Setting(containerEl)
      .setName('Idle after (minutes)')
      .setDesc(
        'Without an action for this long, the alert stops and the ' +
          'counter dims. It also dims while Obsidian is not focused.',
      )
      .addText((component) =>
        component
          .setValue(String(apmSettings.idleMinutes))
          .onChange(async (value) => {
            const minutes = Number(value);
            if (!(minutes > 0)) {
              return;
            }
            apmSettings.idleMinutes = minutes;
            await this.plugin.saveData(this.plugin.settings);
            apm.refresh();
          }),
      );
  }

  displayLayoutAndView() {
    const { containerEl } = this;
    this.addHeading('Layout');
    new obsidian.Setting(containerEl)
      .setName('Layout direction')
      .setDesc(
        'Tidy layout and agent-made plan canvases: the card a branch ' +
          'starts from comes first, following arrows in the fold ' +
          'direction ("depends on" prerequisites too). Shift-click the ' +
          'Tidy layout button, or commands "Tidy layout direction: …", ' +
          'switch it on the fly.',
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
    this.addHeading('View');
    new obsidian.Setting(containerEl)
      .setName('Fold direction')
      .setDesc(
        'Fold branch hides the cards the card points to (outgoing) or ' +
          'the cards pointing to it (incoming), and so on down the ' +
          'branch. Tidy layout reads branches the same way. Commands ' +
          '"Fold direction: …" switch it on the fly.',
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
    new obsidian.Setting(containerEl)
      .setName('Hide cards under hidden tags')
      .setDesc(
        'Hiding a tag in the filter pane also hides the branch of ' +
          'each card that has it, in the fold direction.',
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

// Under the anchor, kept inside its window.
function placeBelow(popover, anchor) {
  const ownerWindow = anchor.ownerDocument.defaultView;
  const box = anchor.getBoundingClientRect();
  const margin = 4;
  const left = Math.min(
    box.left,
    ownerWindow.innerWidth - popover.offsetWidth - margin,
  );
  const below = box.bottom + margin;
  const top =
    below + popover.offsetHeight > ownerWindow.innerHeight
      ? box.top - popover.offsetHeight - margin
      : below;
  popover.style.left = `${Math.max(margin, left)}px`;
  popover.style.top = `${Math.max(margin, top)}px`;
}

export default CanvasBoardSettings;
