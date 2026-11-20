// node test/plugin/run.js: the smoke report must match expected.json.
const assert = require('assert');
const path = require('path');
const childProcess = require('child_process');

const report = childProcess.execFileSync(
  process.execPath,
  [path.join(__dirname, 'smoke.js')],
  { encoding: 'utf8' },
);
const expected = require('./expected.json');
assert.deepStrictEqual(JSON.parse(report), expected);
console.log('plugin smoke: matches');
