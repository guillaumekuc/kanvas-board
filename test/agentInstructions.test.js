// node test/agentInstructions.test.js: splitting and joining the agent
// instructions file by color section.
const assert = require('assert');
const agentInstructions = require('../src/plugin/agentInstructions.js');

const COLOR_NAMES = ['cyan', 'purple', 'orange', 'none'];

assert.strictEqual(agentInstructions.sectionTitle('cyan'), 'Cyan cards');
assert.strictEqual(agentInstructions.sectionTitle('none'), 'Uncolored cards');

const unsplit = '---\nname: pass\n---\n\n# Pass\n\n1. Inventory.\n';
const allGeneral = agentInstructions.splitInstructions(unsplit, COLOR_NAMES);
assert.strictEqual(allGeneral.general, unsplit.trimEnd());
assert.deepStrictEqual(Object.values(allGeneral.colors), ['', '', '', '']);
assert.strictEqual(
  agentInstructions.joinInstructions(allGeneral, COLOR_NAMES),
  unsplit,
);

const file =
  '# Pass\r\n\r\nGeneral.\r\n\r\n## Purple cards\r\n\r\n- One step.\r\n' +
  '### Detail\r\n\r\n## Uncolored cards\r\nNever touched.\r\n\r\n' +
  '## Cyan cards\r\n\r\n  - Indented first line.\r\n';
const parts = agentInstructions.splitInstructions(file, COLOR_NAMES);
assert.strictEqual(parts.general, '# Pass\n\nGeneral.');
assert.strictEqual(parts.colors.purple, '- One step.\n### Detail');
assert.strictEqual(parts.colors.none, 'Never touched.');
assert.strictEqual(parts.colors.cyan, '  - Indented first line.');
assert.strictEqual(parts.colors.orange, '');

const joined = agentInstructions.joinInstructions(parts, COLOR_NAMES);
assert.strictEqual(
  joined,
  '# Pass\n\nGeneral.\n\n## Cyan cards\n\n  - Indented first line.\n\n' +
    '## Purple cards\n\n- One step.\n### Detail\n\n' +
    '## Uncolored cards\n\nNever touched.\n',
);
assert.deepStrictEqual(
  agentInstructions.splitInstructions(joined, COLOR_NAMES),
  parts,
);

const edited = { general: 'G', colors: { orange: '\n\nLeave it.\n\n' } };
assert.strictEqual(
  agentInstructions.joinInstructions(edited, COLOR_NAMES),
  'G\n\n## Orange cards\n\nLeave it.\n',
);
assert.strictEqual(
  agentInstructions.splitInstructions(undefined, COLOR_NAMES).general,
  '',
);

console.log('agent instructions: ok');
