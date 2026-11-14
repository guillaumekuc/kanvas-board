// Makes canvas.js deterministic and offline for the golden test:
// no Obsidian CLI, fixed clock, seeded ids.
const childProcess = require('child_process');
const FIXED_NOW = Date.parse('2026-01-15T12:00:00Z');

childProcess.execFileSync = () => {
  const missing = new Error('Obsidian CLI disabled in tests');
  missing.code = 'ENOENT';
  throw missing;
};

let seed = 42;
Math.random = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};

const RealDate = Date;
global.Date = class FixedDate extends RealDate {
  constructor(...values) {
    if (values.length === 0) super(FIXED_NOW);
    else super(...values);
  }

  static now() {
    return FIXED_NOW;
  }
};
