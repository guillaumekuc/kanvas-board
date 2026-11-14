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
assert.strictEqual(band(10, 3, 25), 'calibrating');
assert.strictEqual(band(20, 20, 25), 'best');
assert.strictEqual(band(16, 20, 25), 'green');
assert.strictEqual(band(1, 20, 25), 'low');
assert.strictEqual(band(1, 20, 25, true), 'calibrating');
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

// Settings: the old plugin's personal best carries over, its own stored settings win, another unit is dropped.
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

// Shown only while a canvas is the active tab; the count keeps running elsewhere.
global.window = { document: { hasFocus: () => true } };
const el = {
  shown: null,
  text: '',
  cls: new Set(),
  toggle(v) {
    this.shown = v;
  },
  setText(t) {
    this.text = t;
  },
  addClass(c) {
    this.cls.add(c);
  },
  removeClass(c) {
    this.cls.delete(c);
  },
  setAttribute() {},
};
let canvas = null;
const plugin = {
  app: { workspace: {} },
  activeCanvas: () => canvas,
  addStatusBarItem: () => el,
};
let saves = 0;
const a = new ApmCounter(plugin, loadSettings(undefined, legacy), async () => {
  saves++;
});
a.el = el;
a.refresh();
assert.strictEqual(el.shown, false, 'hidden in a regular note');
assert.strictEqual(el.text, '');
a.record(['Board.canvas#a']);
assert.strictEqual(a.pace(), 1);
assert.strictEqual(el.shown, false);
canvas = {};
a.refresh();
assert.strictEqual(el.shown, true, 'shown on a canvas');
assert.strictEqual(el.text, '1 AP15M · PB 23');

// A new window resets the personal best and is saved.
(async () => {
  await a.setWindow(5);
  assert.strictEqual(a.settings.pb, 0);
  assert.strictEqual(a.settings.unit, 'cards/5');
  assert.strictEqual(saves, 1);
  console.log('ok');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
