const { INPUT_MS, MINUTE_MS, SAVE_EVERY_MS } = require('./constants.js');
const band = require('./band.js');
const cardsOf = require('./cardsOf.js');
const rateName = require('./rateName.js');
const touchedCards = require('./touchedCards.js');
const unitOf = require('./unitOf.js');

class ApmCounter {
  // plugin: the Kanvas board plugin (registerEvent, registerDomEvent, registerInterval, addStatusBarItem, activeCanvas, app);
  // save(): writes the plugin's data.json, with this.settings in it.
  constructor(plugin, settings, save) {
    this.plugin = plugin;
    this.app = plugin.app;
    this.settings = settings;
    this.save = save;
    this.touched = new Map(); // card key -> last touch, only inside the window
    this.snapshots = new Map(); // canvas path -> its cards at the last save
    this.lastAction = 0;
    this.sessionStart = 0;
    this.lastInput = 0;
    this.lastSave = 0;
    this.dirty = false;
  }

  load() {
    const { plugin } = this;
    this.element = plugin.addStatusBarItem();
    this.element.addClass('apm-counter');
    const listen = (targetWindow) => {
      const input = () => {
        this.lastInput = Date.now();
      };
      plugin.registerDomEvent(targetWindow, 'keydown', input, {
        capture: true,
        passive: true,
      });
      plugin.registerDomEvent(targetWindow, 'mousedown', input, {
        capture: true,
        passive: true,
      });
    };
    listen(window);
    plugin.registerEvent(
      this.app.workspace.on('window-open', (workspaceWindow) =>
        listen(workspaceWindow.win),
      ),
    );
    plugin.registerEvent(
      this.app.workspace.on('active-leaf-change', () => this.refresh()),
    );
    this.app.workspace.onLayoutReady(async () => {
      for (const file of this.app.vault.getFiles()) {
        if (file.extension === 'canvas') await this.snapshot(file);
      }
      plugin.registerEvent(
        this.app.vault.on('modify', (file) => this.onModify(file)),
      );
      plugin.registerEvent(
        this.app.vault.on('rename', (file, old) => {
          if (this.snapshots.has(old)) {
            this.snapshots.set(file.path, this.snapshots.get(old));
            this.snapshots.delete(old);
          }
        }),
      );
    });
    plugin.registerInterval(window.setInterval(() => this.refresh(), 1000));
    this.refresh();
  }

  async unload() {
    if (this.dirty) await this.save();
  }

  // Returns the file's cards, or null when it can't be read as a canvas right now (a half-written file).
  async snapshot(file) {
    try {
      const cards = cardsOf(await this.app.vault.read(file));
      this.snapshots.set(file.path, cards);
      return cards;
    } catch {
      return null;
    }
  }

  async onModify(file) {
    if (file.extension !== 'canvas') return;
    const before = this.snapshots.get(file.path);
    const after = await this.snapshot(file);
    if (!before || !after) return;
    const now = Date.now();
    if (
      now - this.lastInput > INPUT_MS ||
      this.app.workspace.getActiveFile()?.path !== file.path
    ) {
      return;
    }
    this.record(
      touchedCards(before, after).map((id) => `${file.path}#${id}`),
      now,
    );
  }

  record(keys, now = Date.now()) {
    if (!keys.length) return;
    for (const cardId of keys) this.touched.set(cardId, now);
    if (now - this.lastAction > this.settings.idleMinutes * MINUTE_MS) {
      this.sessionStart = now;
    }
    this.lastAction = now;
    this.refresh(now);
  }

  pace(now = Date.now()) {
    const windowMs = this.settings.windowMinutes * MINUTE_MS;
    for (const [cardId, touchedAt] of this.touched) {
      if (touchedAt <= now - windowMs) this.touched.delete(cardId);
    }
    return this.touched.size;
  }

  isIdle(now) {
    if (now - this.lastAction > this.settings.idleMinutes * MINUTE_MS) {
      return true;
    }
    const windows = [
      window,
      ...[...(this.app.workspace.floatingSplit?.children ?? [])].map(
        (container) => container.win,
      ),
    ];
    return !windows.some(
      (candidateWindow) =>
        candidateWindow && candidateWindow.document.hasFocus(),
    );
  }

  refresh(now = Date.now()) {
    const pace = this.pace(now);
    const settings = this.settings;
    if (pace > settings.pb) {
      settings.pb = pace;
      settings.pbDate = new Date(now).toISOString().slice(0, 10);
      this.dirty = true;
    }
    if (this.dirty && now - this.lastSave >= SAVE_EVERY_MS) {
      this.dirty = false;
      this.lastSave = now;
      this.save();
    }
    const isShown = !!this.plugin.activeCanvas();
    if (this.isShown !== isShown) {
      this.element.toggle(isShown);
      this.isShown = isShown;
    }
    if (!isShown) return; // the window and the PB keep running, only the display stops outside a canvas
    const state = this.isIdle(now)
      ? 'idle'
      : band(pace, {
          personalBest: settings.pb,
          lowPercent: settings.lowPercent,
          isWarmingUp:
            now - this.sessionStart < settings.windowMinutes * MINUTE_MS,
        });
    if (this.state !== state) {
      if (this.state) this.element.removeClass('apm-' + this.state);
      this.element.addClass('apm-' + state);
      this.state = state;
    }
    const text = `${pace} ${rateName(settings.windowMinutes)} · PB ${settings.pb}`;
    if (this.text !== text) {
      this.element.setText(text);
      this.text = text;
      const what = `Cards touched in the last ${settings.windowMinutes} min.`;
      this.element.setAttribute(
        'aria-label',
        settings.pbDate
          ? `${what} Personal best set ${settings.pbDate}.`
          : what,
      );
    }
  }

  async resetPb() {
    this.settings.pb = 0;
    this.settings.pbDate = '';
    this.touched.clear();
    this.dirty = false;
    await this.save();
    this.refresh();
  }

  async setWindow(minutes) {
    this.settings.windowMinutes = minutes;
    this.settings.unit = unitOf(minutes);
    await this.resetPb();
  }
}

module.exports = ApmCounter;
