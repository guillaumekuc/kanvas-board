// node test/apm.test.js: the APM counter with Obsidian stubbed.
const assert = require('assert');
const ApmCounter = require('../src/apm/ApmCounter.js');
const loadSettings = require('../src/apm/loadSettings.js');
const band = require('../src/apm/band.js');
const rateName = require('../src/apm/rateName.js');
const touchedCards = require('../src/apm/touchedCards.js');
const cardsOf = require('../src/apm/cardsOf.js');
const unitOf = require('../src/apm/unitOf.js');

assert.strictEqual(rateName(15), 'AP15M');
assert.strictEqual(rateName(1), 'APM');
assert.strictEqual(
  band(10, { personalBest: 3, lowPercent: 25 }),
  'calibrating',
);
assert.strictEqual(band(20, { personalBest: 20, lowPercent: 25 }), 'best');
assert.strictEqual(band(16, { personalBest: 20, lowPercent: 25 }), 'green');
assert.strictEqual(band(1, { personalBest: 20, lowPercent: 25 }), 'low');
assert.strictEqual(
  band(1, { personalBest: 20, lowPercent: 25, isWarmingUp: true }),
  'calibrating',
);
const before = cardsOf(
  JSON.stringify({
    nodes: [
      { id: 'a', text: 'x', x: 0 },
      { id: 'b', text: 'y' },
    ],
  }),
);
const after = cardsOf(
  JSON.stringify({
    nodes: [
      { id: 'a', text: 'x', x: 99 },
      { id: 'c', text: 'z' },
    ],
  }),
);
assert.deepStrictEqual(
  touchedCards(before, after).sort(),
  ['b', 'c'],
  'moving a card is not an action',
);

// Settings: the old plugin's personal best carries over, its own stored
// settings win, another unit is dropped.
const legacy = {
  pb: 23,
  pbDate: '2026-11-05',
  lowPercent: 25,
  idleMinutes: 5,
  windowMinutes: 15,
  unit: unitOf(15),
};
assert.strictEqual(loadSettings(undefined, legacy).pb, 23);
assert.strictEqual(loadSettings({ ...legacy, pb: 30 }, legacy).pb, 30);
assert.strictEqual(loadSettings({ ...legacy, unit: 'cards/1' }).pb, 0);
assert.strictEqual(loadSettings(undefined, undefined).pb, 0);

// Shown only while a canvas is the active tab; the count keeps running
// elsewhere.
global.window = { document: { hasFocus: () => true } };
const element = {
  shown: null,
  text: '',
  cls: new Set(),
  toggle(isShown) {
    this.shown = isShown;
  },
  setText(text) {
    this.text = text;
  },
  addClass(className) {
    this.cls.add(className);
  },
  removeClass(className) {
    this.cls.delete(className);
  },
  setAttribute() {},
};
const active = { canvas: null, saves: 0 };
const plugin = {
  app: { workspace: {} },
  activeCanvas: () => active.canvas,
  addStatusBarItem: () => element,
};
const counter = new ApmCounter(
  plugin,
  loadSettings(undefined, legacy),
  async () => {
    active.saves++;
  },
);
counter.element = element;
counter.refresh();
assert.strictEqual(element.shown, false, 'hidden in a regular note');
assert.strictEqual(element.text, '');
counter.record(['Board.canvas#a']);
assert.strictEqual(counter.pace(), 1);
assert.strictEqual(element.shown, false);
active.canvas = {};
counter.refresh();
assert.strictEqual(element.shown, true, 'shown on a canvas');
assert.strictEqual(element.text, '1 AP15M · PB 23');

// A new window resets the personal best and is saved.
(async () => {
  await counter.setWindow(5);
  assert.strictEqual(counter.settings.pb, 0);
  assert.strictEqual(counter.settings.unit, 'cards/5');
  assert.strictEqual(active.saves, 1);
  console.log('ok');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
