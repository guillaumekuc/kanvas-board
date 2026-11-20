// node test/apm.test.js: the APM counter with Obsidian stubbed.
const assert = require('assert');
const apm = require('../src/apm/apm.js');

assert.strictEqual(apm.rateName(15), 'AP15M');
assert.strictEqual(apm.rateName(1), 'APM');
assert.strictEqual(
  apm.band(10, { personalBest: 3, lowPercent: 25 }),
  'calibrating',
);
assert.strictEqual(apm.band(20, { personalBest: 20, lowPercent: 25 }), 'best');
assert.strictEqual(apm.band(16, { personalBest: 20, lowPercent: 25 }), 'green');
assert.strictEqual(apm.band(1, { personalBest: 20, lowPercent: 25 }), 'low');
assert.strictEqual(
  apm.band(1, { personalBest: 20, lowPercent: 25, isWarmingUp: true }),
  'calibrating',
);
const before = apm.cardsOf(
  JSON.stringify({
    nodes: [
      { id: 'a', text: 'x', x: 0 },
      { id: 'b', text: 'y' },
    ],
  }),
);
const after = apm.cardsOf(
  JSON.stringify({
    nodes: [
      { id: 'a', text: 'x', x: 99 },
      { id: 'c', text: 'z' },
    ],
  }),
);
assert.deepStrictEqual(
  apm.touchedCards(before, after).sort(),
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
  unit: apm.unitOf(15),
};
assert.strictEqual(apm.loadSettings(undefined, legacy).pb, 23);
assert.strictEqual(apm.loadSettings({ ...legacy, pb: 30 }, legacy).pb, 30);
assert.strictEqual(apm.loadSettings({ ...legacy, unit: 'cards/1' }).pb, 0);
assert.strictEqual(apm.loadSettings(undefined, undefined).pb, 0);

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
const counter = new apm.ApmCounter(
  plugin,
  apm.loadSettings(undefined, legacy),
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
