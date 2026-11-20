import * as store from '../board/store.js';

// The user's workflow: `workflow` in data.json (Settings > Workflow), merged
// over the defaults, which are the plugin's original behavior. One accessor,
// `resolve(settings)`, read by workflow.js, the plugin and the CLI.

const ROLES = ['working', 'blocked', 'review', 'done', 'idle'];
// What each role does, shown under its color in Settings > Workflow.
const ROLE_MEANINGS = {
  working: 'An agent is on the card (required: exactly one color).',
  blocked: 'Waiting on you: nothing moves until it is unblocked.',
  review: 'Waiting on you: a question or a review; ages after "Stale after".',
  done: 'Finished: a parent whose cards are all done takes it.',
  idle: 'No state of its own.',
};
const DEFAULT_WORKFLOW = {
  roles: {
    red: 'blocked',
    orange: 'working',
    yellow: 'review',
    green: 'done',
    cyan: 'idle',
    purple: 'idle',
  },
  markers: {
    question: '?',
    answer: 'i',
    decisionsRecord: '## Decisions Record',
  },
  // vault paths; empty: <notes folder>/_templates/Card.md, Plan note.md
  cardTemplate: '',
  noteTemplate: '',
};
const DEFAULT_NOTES_FOLDER = 'Board notes';
const TRAILING_SLASHES = /[/]+$/;
const PLACEHOLDER = /\{(\w+)\}/g;

const CARD_COMMENT =
  '%% Card template: the shapes of the card text an agent writes, one per ' +
  'line. A {word} stands for any text. A card without a [[link]] is a wish ' +
  '(free text) and always passes. Comments like this one are ignored. %%';
const NOTE_COMMENT =
  '%% Plan note template: the frontmatter keys and headings of a note an ' +
  'agent writes for a card. Every heading is required, except one followed ' +
  'by an "optional" comment line, or a "when done" one (required once the ' +
  'card has the done color). Comments are for this template only: leave ' +
  'them out of the notes. %%';

const CARD_TEMPLATE = `${CARD_COMMENT}
[[{note}]]
[[{note}]] · {reason}
{recap} · done · [[{output}]]
`;

const NOTE_TEMPLATE = `---
context:
  -
---
${NOTE_COMMENT}
> [!info] Since last time

## Aim

### Done when

## Output
%% when done %%

## Design

## Open questions
%% optional %%

## Decisions Record
%% optional %%
`;

function folderOf(settings) {
  return String(settings.notesFolder || DEFAULT_NOTES_FOLDER).replace(
    TRAILING_SLASHES,
    '',
  );
}

function templatePaths(settings, workflow) {
  const folder = `${folderOf(settings)}/_templates`;

  return {
    cardTemplate: workflow.cardTemplate || `${folder}/Card.md`,
    noteTemplate: workflow.noteTemplate || `${folder}/Plan note.md`,
  };
}

function colorsWith(roles, role) {
  return Object.keys(store.COLORS)
    .filter((name) => roles[name] === role)
    .map((name) => store.COLORS[name]);
}

// settings (data.json) → the workflow as canvas color numbers. Exactly one
// working color: none or several set falls back to the first one, else orange.
function resolve(settings = {}) {
  const own = settings.workflow || {};
  const roles = { ...DEFAULT_WORKFLOW.roles, ...(own.roles || {}) };
  const markers = { ...DEFAULT_WORKFLOW.markers, ...(own.markers || {}) };
  const working = colorsWith(roles, 'working')[0] || store.COLORS.orange;
  const blocked = colorsWith(roles, 'blocked');
  const review = colorsWith(roles, 'review');

  return {
    roles,
    markers,
    working,
    blocked,
    review,
    waiting: new Set([...blocked, ...review]),
    done: colorsWith(roles, 'done')[0] || '',
    notesFolder: folderOf(settings),
    ...templatePaths(settings, { ...DEFAULT_WORKFLOW, ...own }),
  };
}

// A template's text: the vault note, else the built-in default.
function templateText(kind, workflow) {
  const relativePath =
    kind === 'card' ? workflow.cardTemplate : workflow.noteTemplate;
  const builtIn = kind === 'card' ? CARD_TEMPLATE : NOTE_TEMPLATE;

  return store.readOrNull(relativePath) || builtIn;
}

function colorName(number) {
  return (
    Object.keys(store.COLORS).find((name) => store.COLORS[name] === number) ||
    'none'
  );
}

// The values `{name}` placeholders take in the agent instructions, filled in
// when a pass starts (and printed by `canvas.js workflow`).
function placeholders(workflow) {
  return {
    notesFolder: workflow.notesFolder,
    working: colorName(workflow.working),
    done: workflow.done ? colorName(workflow.done) : 'none',
    blocked: workflow.blocked.map(colorName).join(' '),
    review: workflow.review.map(colorName).join(' '),
    cardTemplate: workflow.cardTemplate,
    noteTemplate: workflow.noteTemplate,
    question: `- [${workflow.markers.question}]`,
    answer: `- [${workflow.markers.answer}]`,
    decisionsRecord: workflow.markers.decisionsRecord,
  };
}

// Unknown placeholders stay as written.
function fillPlaceholders(text, workflow) {
  const values = placeholders(workflow);

  return String(text).replace(PLACEHOLDER, (match, name) =>
    name in values ? values[name] : match,
  );
}

export {
  ROLES,
  ROLE_MEANINGS,
  DEFAULT_WORKFLOW,
  DEFAULT_NOTES_FOLDER,
  CARD_TEMPLATE,
  NOTE_TEMPLATE,
  resolve,
  templateText,
  colorName,
  placeholders,
  fillPlaceholders,
};
