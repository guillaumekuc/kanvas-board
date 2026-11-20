const MINUTE_MS = 60000;
// a saved change only counts this soon after a key or mouse press (agents and
// sync write files too)
const INPUT_MS = 10000;
// under this the ratio to PB means nothing (just after a reset): no color, no
// alert
const MIN_PB = 5;
const SAVE_EVERY_MS = 10000;
const CONTENT_KEYS = ['text', 'file', 'subpath', 'url', 'label', 'color'];
const DEFAULTS = {
  pb: 0,
  pbDate: '',
  lowPercent: 25,
  idleMinutes: 5,
  windowMinutes: 15,
};

function band(pace, { personalBest, lowPercent, isWarmingUp = false }) {
  if (personalBest < MIN_PB) {
    return 'calibrating';
  }
  if (pace >= personalBest) {
    return 'best';
  }

  const ratio = (pace / personalBest) * 100;
  // a session's first window can't be full yet: no alert
  if (ratio < lowPercent) {
    return isWarmingUp ? 'calibrating' : 'low';
  }
  if (ratio < 50) {
    return 'orange';
  }
  if (ratio < 75) {
    return 'yellow';
  }

  return 'green';
}

function cardsOf(json) {
  const map = new Map();
  for (const node of JSON.parse(json || '{}').nodes || []) {
    map.set(
      node.id,
      JSON.stringify(CONTENT_KEYS.map((key) => node[key] ?? null)),
    );
  }

  return map;
}

function rateName(windowMinutes) {
  return windowMinutes === 1 ? 'APM' : `AP${windowMinutes}M`;
}

// Ids of the cards created, deleted, or changed in content or color. Pure, for
// the tests.
function touchedCards(before, after) {
  const out = [];
  for (const [id, content] of after) {
    if (before.get(id) !== content) {
      out.push(id);
    }
  }
  for (const id of before.keys()) {
    if (!after.has(id)) {
      out.push(id);
    }
  }

  return out;
}

// a personal best from another unit is not comparable: it is dropped
function unitOf(windowMinutes) {
  return `cards/${windowMinutes}`;
}

class ApmCounter {
  // plugin: the Kanvas board plugin (registerEvent, registerDomEvent,
  // registerInterval, addStatusBarItem, activeCanvas, app); save(): writes the
  // plugin's data.json, with this.settings in it.
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
    this.listenTo(window);
    plugin.registerEvent(
      this.app.workspace.on('window-open', (workspaceWindow) =>
        this.listenTo(workspaceWindow.win),
      ),
    );
    plugin.registerEvent(
      this.app.workspace.on('active-leaf-change', () => this.refresh()),
    );
    this.app.workspace.onLayoutReady(async () => {
      for (const file of this.app.vault.getFiles()) {
        if (file.extension === 'canvas') {
          await this.snapshot(file);
        }
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

  // Any key or click in a window counts as activity for the APM rate.
  listenTo(targetWindow) {
    const input = () => {
      this.lastInput = Date.now();
    };
    const options = { capture: true, passive: true };
    this.plugin.registerDomEvent(targetWindow, 'keydown', input, options);
    this.plugin.registerDomEvent(targetWindow, 'mousedown', input, options);
  }

  async unload() {
    if (this.dirty) {
      await this.save();
    }
  }

  // Returns the file's cards, or null when it can't be read as a canvas right
  // now (a half-written file).
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
    if (file.extension !== 'canvas') {
      return;
    }

    const before = this.snapshots.get(file.path);
    const after = await this.snapshot(file);
    if (!before || !after) {
      return;
    }
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
    if (!keys.length) {
      return;
    }

    for (const cardId of keys) {
      this.touched.set(cardId, now);
    }
    if (now - this.lastAction > this.settings.idleMinutes * MINUTE_MS) {
      this.sessionStart = now;
    }
    this.lastAction = now;
    this.refresh(now);
  }

  pace(now = Date.now()) {
    const windowMs = this.settings.windowMinutes * MINUTE_MS;
    for (const [cardId, touchedAt] of this.touched) {
      if (touchedAt <= now - windowMs) {
        this.touched.delete(cardId);
      }
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
    // the window and the PB keep running, only the display stops outside a
    // canvas
    if (!isShown) {
      return;
    }
    const state = this.isIdle(now)
      ? 'idle'
      : band(pace, {
          personalBest: settings.pb,
          lowPercent: settings.lowPercent,
          isWarmingUp:
            now - this.sessionStart < settings.windowMinutes * MINUTE_MS,
        });
    if (this.state !== state) {
      if (this.state) {
        this.element.removeClass('apm-' + this.state);
      }
      this.element.addClass('apm-' + state);
      this.state = state;
    }
    const text =
      `${pace} ${rateName(settings.windowMinutes)} · PB ` + `${settings.pb}`;
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

// The settings live under `apm` in the plugin's data.json. First load: taken
// over from the old apm-counter plugin's file, if any.
function loadSettings(stored, legacy) {
  const settings = Object.assign({}, DEFAULTS, stored || legacy || {});
  if (settings.unit !== unitOf(settings.windowMinutes)) {
    Object.assign(settings, {
      pb: 0,
      pbDate: '',
      unit: unitOf(settings.windowMinutes),
    });
  }

  return settings;
}

export {
  MINUTE_MS,
  INPUT_MS,
  MIN_PB,
  SAVE_EVERY_MS,
  CONTENT_KEYS,
  DEFAULTS,
  band,
  cardsOf,
  rateName,
  touchedCards,
  unitOf,
  ApmCounter,
  loadSettings,
};
