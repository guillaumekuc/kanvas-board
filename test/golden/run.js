// node test/golden/run.js [--update]: runs canvas.js commands on a synthetic
// vault and compares output and resulting files with golden.json.
const fileSystem = require('fs');
const operatingSystem = require('os');
const path = require('path');
const assert = require('assert');
const util = require('util');
const runScenario = require('./runScenario.js');
const SCENARIOS = require('./scenarios.js');

const GOLDEN = path.join(__dirname, 'golden.json');

const actual = Object.fromEntries(
  Object.entries(SCENARIOS).map(([name, commands]) => [
    name,
    runScenario(commands),
  ]),
);
if (process.argv.includes('--update')) {
  fileSystem.writeFileSync(GOLDEN, JSON.stringify(actual, null, 2));
  console.log(`golden: ${Object.keys(actual).length} scenarios written`);
} else {
  const expected = JSON.parse(fileSystem.readFileSync(GOLDEN, 'utf8'));
  const failed = Object.keys(expected).filter(
    (name) => !util.isDeepStrictEqual(actual[name], expected[name]),
  );
  for (const name of failed) {
    fileSystem.writeFileSync(
      path.join(operatingSystem.tmpdir(), `kanvas-golden-${name}.json`),
      JSON.stringify(actual[name], null, 2),
    );
  }
  assert.deepStrictEqual(
    failed,
    [],
    `actual output in ` +
      `${operatingSystem.tmpdir()}/kanvas-golden-<scenario>.json`,
  );
  console.log(`golden: ${Object.keys(expected).length} scenarios match`);
}
