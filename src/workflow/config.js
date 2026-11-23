import * as store from '../board/store.js';

// The user's workflow: `workflow` in data.json (Settings > Workflow), merged
// over the defaults. One accessor, `resolve(settings)`, read by workflow.js,
// the plugin and the CLI.

// Six fixed roles, named after their default labels. Each keeps its rules in
// the code (do and plan share theirs: the agent instructions tell them apart);
// the user picks its color, label and instructions. `color`: the default.
const ROLES = [
  {
    role: 'do',
    color: 'cyan',
    label: 'Do',
    meaning: 'The agent carries the card to done.',
  },
  {
    role: 'plan',
    color: 'purple',
    label: 'Plan',
    meaning: 'The agent takes one step, then hands back.',
  },
  {
    role: 'inProgress',
    color: 'orange',
    label: 'In Progress',
    meaning: 'A pass is on the card.',
  },
  {
    role: 'review',
    color: 'yellow',
    label: 'Review',
    meaning: 'A question or a review for you.',
  },
  {
    role: 'blocked',
    color: 'red',
    label: 'Blocked',
    meaning: 'Nothing moves until it is unblocked.',
  },
  {
    role: 'done',
    color: 'green',
    label: 'Done',
    meaning: 'Finished. Remove the card when it no longer helps.',
  },
];
// Uncolored cards: no role.
const INBOX = {
  label: 'Inbox',
  meaning: 'No state. The agent never touches it.',
};
const DEFAULT_WORKFLOW = {
  // role → color name, when the user picked another color
  colors: Object.fromEntries(ROLES.map(({ role, color }) => [role, color])),
  // vault paths; empty: <notes folder>/_templates/Card.md, Plan note.md,
  // Agent instructions.md
  cardTemplate: '',
  noteTemplate: '',
  instructions: '',
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
    instructions: workflow.instructions || `${folder}/Agent instructions.md`,
  };
}

// Each role one color, each color one role: a set that is not (a typo, two
// roles on one color) falls back to the defaults.
function roleColors(own = {}) {
  const colors = { ...DEFAULT_WORKFLOW.colors, ...own };
  const picked = Object.values(colors);
  const isValid =
    picked.every((name) => store.COLORS[name]) &&
    new Set(picked).size === picked.length;

  return isValid ? colors : { ...DEFAULT_WORKFLOW.colors };
}

// settings (data.json) → the workflow as canvas color numbers.
function resolve(settings = {}) {
  const own = settings.workflow || {};
  const colors = roleColors(own.colors);
  function number(role) {
    return store.COLORS[colors[role]];
  }
  const blocked = [number('blocked')];
  const review = [number('review')];

  return {
    colors,
    roleOf: Object.fromEntries(
      Object.entries(colors).map(([role, name]) => [name, role]),
    ),
    working: number('inProgress'),
    blocked,
    review,
    waiting: new Set([...blocked, ...review]),
    done: number('done'),
    notesFolder: folderOf(settings),
    ...templatePaths(settings, { ...DEFAULT_WORKFLOW, ...own }),
  };
}

// A role's default label and meaning (INBOX for uncolored).
function roleInfo(role) {
  return ROLES.find((each) => each.role === role) || INBOX;
}

// A color's default label: its role's.
function defaultLabel(colorName, workflow) {
  return roleInfo(workflow.roleOf[colorName]).label;
}

// Picking a taken color swaps the two roles' colors.
function swapColors(colors, role, colorName) {
  const other = Object.keys(colors).find((each) => colors[each] === colorName);

  return { ...colors, [other]: colors[role], [role]: colorName };
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
    done: colorName(workflow.done),
    blocked: workflow.blocked.map(colorName).join(' '),
    review: workflow.review.map(colorName).join(' '),
    cardTemplate: workflow.cardTemplate,
    noteTemplate: workflow.noteTemplate,
    instructions: workflow.instructions,
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
  INBOX,
  DEFAULT_WORKFLOW,
  DEFAULT_NOTES_FOLDER,
  CARD_TEMPLATE,
  NOTE_TEMPLATE,
  resolve,
  roleInfo,
  defaultLabel,
  swapColors,
  templateText,
  colorName,
  placeholders,
  fillPlaceholders,
};
