// node test/workflowConfig.test.js: the user-defined workflow (config.js), the
// rules check reads from the templates, and the roll-up with other colors.
const assert = require('assert');
const config = require('../src/workflow/config.js');
const templateRules = require('../src/workflow/templateRules.js');
const workflow = require('../src/workflow/workflow.js');

// Defaults: the original behavior.
const defaults = config.resolve({});
assert.strictEqual(defaults.working, '2');
assert.deepStrictEqual(defaults.blocked, ['1']);
assert.deepStrictEqual(defaults.review, ['3']);
assert.strictEqual(defaults.done, '4');
assert.strictEqual(defaults.notesFolder, 'Board notes');
assert.strictEqual(
  defaults.noteTemplate,
  'Board notes/_templates/Plan note.md',
);
assert.strictEqual(
  defaults.instructions,
  'Board notes/_templates/Agent instructions.md',
);
assert.strictEqual(
  config.fillPlaceholders('see {instructions}', defaults),
  'see Board notes/_templates/Agent instructions.md',
);

// Slots are fixed, roles show other colors (a theme): In Progress shows
// purple, Plan orange, Do a custom hex, Blocked a typo (its default).
const custom = config.resolve({
  notesFolder: 'Tasks/',
  workflow: {
    colors: {
      inProgress: 'purple',
      plan: 'orange',
      do: '#8A5CF5',
      blocked: 'pink',
    },
    cardTemplate: 'My card.md',
  },
});
assert.strictEqual(custom.working, '2');
assert.deepStrictEqual(custom.blocked, ['1']);
assert.strictEqual(custom.done, '4');
assert.deepStrictEqual(custom.colors, {
  do: '#8a5cf5',
  plan: 'orange',
  inProgress: 'purple',
  review: 'yellow',
  blocked: 'red',
  done: 'green',
});
assert.strictEqual(custom.roleOf.cyan, 'do');
assert.strictEqual(config.defaultLabel('purple', custom), 'Plan');
assert.strictEqual(custom.cardTemplate, 'My card.md');
assert.strictEqual(custom.noteTemplate, 'Tasks/_templates/Plan note.md');

// Two roles may show one color.
assert.strictEqual(
  config.resolve({ workflow: { colors: { do: 'purple' } } }).colors.plan,
  'purple',
);

// Role names and slot color names, any case, as slot numbers.
for (const [name, slot] of [
  ['do', '5'],
  ['inProgress', '2'],
  ['INPROGRESS', '2'],
  ['orange', '2'],
  ['Cyan', '5'],
  ['3', '3'],
  ['#abc', '#abc'],
]) {
  assert.strictEqual(config.slotOf(name), slot, name);
}
assert.deepStrictEqual([...defaults.go], ['5', '6']);

// The theme overrides only the slots showing another color.
assert.strictEqual(config.themeCss(defaults.colors), '');
assert.strictEqual(
  config.themeCss(custom.colors),
  'body.theme-dark, body.theme-light {\n' +
    '  --canvas-color-5: #8a5cf5;\n' +
    '  --canvas-color-6: var(--color-orange);\n' +
    '  --canvas-color-2: var(--color-purple);\n' +
    '}\n',
);

assert.strictEqual(
  config.fillPlaceholders(
    'Notes in {notesFolder}, {working} works, {blocked} waits, {unknown}.',
    custom,
  ),
  'Notes in Tasks, inProgress works, blocked waits, {unknown}.',
);

// Card shapes from the default template.
const shapes = templateRules.cardShapes(config.CARD_TEMPLATE);
assert.strictEqual(shapes.lines.length, 3);
for (const text of [
  'Any wish, no link',
  '[[Note]]',
  '[[Note]] · 2 questions',
  'Built it · done · [[SOP|the SOP]]',
]) {
  assert.ok(workflow.cardTextOk(text, shapes), text);
}
for (const text of ['See [[Note]] first', '[[Note]] - review']) {
  assert.ok(!workflow.cardTextOk(text, shapes), text);
}
// A custom shape.
const ticket = templateRules.cardShapes('%% mine %%\n{id}: [[{note}]]\n');
assert.ok(workflow.cardTextOk('T-12: [[Fix login]]', ticket));
assert.ok(!workflow.cardTextOk('[[Fix login]] · review', ticket));

// Note shape from the default template.
const shape = templateRules.noteShape(config.NOTE_TEMPLATE);
assert.deepStrictEqual(shape.keys, []);
assert.deepStrictEqual(
  shape.required.map((heading) => heading.line),
  ['## Overview', '## Plan'],
);
assert.deepStrictEqual(shape.whenDone, []);
const rules = { shape, done: '4' };
const good = '## Overview\n**Done when:** x\n## Plan\n';
assert.deepStrictEqual(workflow.noteIssues(good, '5', rules), []);
assert.deepStrictEqual(workflow.noteIssues(good, '4', rules), []);
// A template without frontmatter leaves the note's frontmatter free.
const withContext = '---\ncontext:\n  - PD\n---\n' + good;
assert.deepStrictEqual(workflow.noteIssues(withContext, '5', rules), []);
assert.deepStrictEqual(workflow.noteIssues('## Plan\n', '5', rules), [
  'note has no ## Overview',
]);
// A custom note template: other keys and headings.
const mine = templateRules.noteShape(
  '---\nproject:\nowner:\n---\n# Goal\n## Steps\n## Notes\n%% optional %%\n',
);
assert.deepStrictEqual(
  workflow.noteIssues('---\nproject: x\n---\n# Goal\n', '5', {
    shape: mine,
    done: '',
  }),
  [
    'note frontmatter is not `project, owner` only (project)',
    'note has no ## Steps (under Goal)',
  ],
);

// Roll-up under a theme (slots unchanged): blocked climbs over review; a
// resolved rolled-up card takes the done slot.
const inner = workflow.colorCounts(['3', '1', '1'], custom);
assert.strictEqual(inner.total, 3);
assert.strictEqual(
  workflow.desiredColor({ text: 'Sub', color: '' }, inner, {
    workflow: custom,
  }),
  '1',
);
const resolved = workflow.colorCounts(['4', '4'], custom);
assert.strictEqual(resolved.allDone, true);
assert.strictEqual(
  workflow.desiredColor(
    { text: 'Sub · 2 inside', color: '3' },
    workflow.colorCounts(['4', '4'], defaults),
    { workflow: defaults },
  ),
  '4',
);

console.log('workflow config: ok');
