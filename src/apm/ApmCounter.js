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
    this.el = plugin.addStatusBarItem();
    this.el.addClass('apm-counter');
    const listen = (win) => {
      const input = () => {
        this.lastInput = Date.now();
      };
      plugin.registerDomEvent(win, 'keydown', input, {
        capture: true,
        passive: true,
      });
      plugin.registerDomEvent(win, 'mousedown', input, {
        capture: true,
        passive: true,
      });
    };
    listen(window);
    plugin.registerEvent(
      this.app.workspace.on('window-open', (w) => listen(w.win)),
    );
    plugin.registerEvent(
      this.app.workspace.on('active-leaf-change', () => this.refresh()),
    );
    this.app.workspace.onLayoutReady(async () => {
      for (const f of this.app.vault.getFiles()) {if (f.extension === 'canvas') await this.snapshot(f);}
      plugin.registerEvent(
        this.app.vault.on('modify', (f) => this.onModify(f)),
      );
      plugin.registerEvent(
        this.app.vault.on('rename', (f, old) => {
          if (this.snapshots.has(old)) {
            this.snapshots.set(f.path, this.snapshots.get(old));
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
    ) {return;}
    this.record(
      touchedCards(before, after).map((id) => `${file.path}#${id}`),
      now,
    );
  }

  record(keys, now = Date.now()) {
    if (!keys.length) return;
    for (const k of keys) this.touched.set(k, now);
    if (now - this.lastAction > this.settings.idleMinutes * MINUTE_MS) {this.sessionStart = now;}
    this.lastAction = now;
    this.refresh(now);
  }

  pace(now = Date.now()) {
    const windowMs = this.settings.windowMinutes * MINUTE_MS;
    for (const [k, t] of this.touched) {if (t <= now - windowMs) this.touched.delete(k);}
    return this.touched.size;
  }

  isIdle(now) {
    if (now - this.lastAction > this.settings.idleMinutes * MINUTE_MS) {return true;}
    const windows = [
      window,
      ...[...(this.app.workspace.floatingSplit?.children ?? [])].map(
        (c) => c.win,
      ),
    ];
    return !windows.some((w) => w && w.document.hasFocus());
  }

  refresh(now = Date.now()) {
    const pace = this.pace(now);
    const s = this.settings;
    if (pace > s.pb) {
      s.pb = pace;
      s.pbDate = new Date(now).toISOString().slice(0, 10);
      this.dirty = true;
    }
    if (this.dirty && now - this.lastSave >= SAVE_EVERY_MS) {
      this.dirty = false;
      this.lastSave = now;
      this.save();
    }
    const shown = !!this.plugin.activeCanvas();
    if (this.shown !== shown) {
      this.el.toggle(shown);
      this.shown = shown;
    }
    if (!shown) return; // the window and the PB keep running, only the display stops outside a canvas
    const state = this.isIdle(now)
      ? 'idle'
      : band(
          pace,
          s.pb,
          s.lowPercent,
          now - this.sessionStart < s.windowMinutes * MINUTE_MS,
        );
    if (this.state !== state) {
      if (this.state) this.el.removeClass('apm-' + this.state);
      this.el.addClass('apm-' + state);
      this.state = state;
    }
    const text = `${pace} ${rateName(s.windowMinutes)} · PB ${s.pb}`;
    if (this.text !== text) {
      this.el.setText(text);
      this.text = text;
      const what = `Cards touched in the last ${s.windowMinutes} min.`;
      this.el.setAttribute(
        'aria-label',
        s.pbDate ? `${what} Personal best set ${s.pbDate}.` : what,
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
