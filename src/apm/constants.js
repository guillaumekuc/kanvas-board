const MINUTE_MS = 60000;
const INPUT_MS = 10000; // a saved change only counts this soon after a key or mouse press (agents and sync write files too)
const MIN_PB = 5; // under this the ratio to PB means nothing (just after a reset): no color, no alert
const SAVE_EVERY_MS = 10000;
const CONTENT_KEYS = ['text', 'file', 'subpath', 'url', 'label', 'color'];
const DEFAULTS = {
  pb: 0,
  pbDate: '',
  lowPercent: 25,
  idleMinutes: 5,
  windowMinutes: 15,
};

module.exports = {
  MINUTE_MS,
  INPUT_MS,
  MIN_PB,
  SAVE_EVERY_MS,
  CONTENT_KEYS,
  DEFAULTS,
};
