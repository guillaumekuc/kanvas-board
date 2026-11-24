import * as store from '../board/store.js';

// The user's workflow: `workflow` in data.json (Settings > Workflow), merged
// over the defaults. One accessor, `resolve(settings)`, read by workflow.js,
// the plugin and the CLI.

// Six fixed roles, named after their default labels. Each keeps its rules in
// the code (do and plan share theirs: the agent instructions tell them apart)
// and one canvas color slot for good: the number cards store, the Alt+N
// hotkey. `color`: the slot's name (its default color, also an alias of the
// slot); the user picks the color the slot shows (a theme), its label and
// instructions.
const ROLES = [
  {
    role: 'do',
    slot: '5',
    color: 'cyan',
    label: 'Do',
    meaning: 'The agent carries the card to done.',
  },
  {
    role: 'plan',
    slot: '6',
    color: 'purple',
    label: 'Plan',
    meaning: 'The agent takes one step, then hands back.',
  },
  {
    role: 'inProgress',
    slot: '2',
    color: 'orange',
    label: 'In Progress',
    meaning: 'A pass is on the card.',
  },
  {
    role: 'review',
    slot: '3',
    color: 'yellow',
    label: 'Review',
    meaning: 'A question or a review for you.',
  },
  {
    role: 'blocked',
    slot: '1',
    color: 'red',
    label: 'Blocked',
    meaning: 'Nothing moves until it is unblocked.',
  },
  {
    role: 'done',
    slot: '4',
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
  // role → the color its slot shows: a preset name or a hex (#rgb, #rrggbb)
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
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

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
{recap} · [[{output}]]
`;

const NOTE_TEMPLATE = `${NOTE_COMMENT}
> [!info] Since last time
## Overview

**Done when:**
**Output**: %% when done %%
## Plan

## Open questions
%% optional %%
## Decisions
%% optional %%
## Links & Resources
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

// A theme a slot can show: a preset color name or a hex.
function isTheme(color) {
  return !!store.COLORS[color] || HEX_COLOR.test(String(color));
}

// Each role's theme; an invalid one (a typo) falls back to the role's
// default. Two roles may show the same color.
function roleColors(own = {}) {
  return Object.fromEntries(
    ROLES.map(({ role, color }) => [
      role,
      isTheme(own[role]) ? String(own[role]).toLowerCase() : color,
    ]),
  );
}

// A role name or a color name (the slot's alias), any case → its slot
// number; anything else as given.
function slotOf(name) {
  const key = String(name).toLowerCase();
  const role = ROLES.find((each) => each.role.toLowerCase() === key);

  return role ? role.slot : store.COLORS[key] || name;
}

// settings (data.json) → the workflow. Slots are fixed: only the colors they
// show (`colors`, role → theme) come from the user.
function resolve(settings = {}) {
  const own = settings.workflow || {};
  function number(role) {
    return roleInfo(role).slot;
  }
  const blocked = [number('blocked')];
  const review = [number('review')];

  return {
    colors: roleColors(own.colors),
    roleOf: Object.fromEntries(ROLES.map(({ role, color }) => [color, role])),
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

// A slot's role, from its number ('' or unknown: null, uncolored).
function roleOfSlot(number) {
  const found = ROLES.find((each) => each.slot === number);

  return found ? found.role : null;
}

// A slot's default label (by its color name): its role's.
function defaultLabel(colorName, workflow) {
  return roleInfo(workflow.roleOf[colorName]).label;
}

// The CSS a theme puts on the page: each slot whose role shows another color
// than its own overrides Obsidian's --canvas-color-N, so cards, edges, the
// canvas color selector and every dot follow. Vault-wide. Empty: no change.
function themeCss(colors) {
  const lines = ROLES.filter(({ role, color }) => colors[role] !== color).map(
    ({ role, slot }) => {
      const theme = colors[role];
      const value = theme.startsWith('#') ? theme : `var(--color-${theme})`;

      return `  --canvas-color-${slot}: ${value};`;
    },
  );

  return lines.length
    ? `body.theme-dark, body.theme-light {\n${lines.join('\n')}\n}\n`
    : '';
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

// The values `{name}` placeholders take in the agent instructions (role
// names: `set --color inProgress` reads them), filled in when a pass starts
// (and printed by `canvas.js workflow`).
function placeholders(workflow) {
  return {
    notesFolder: workflow.notesFolder,
    working: roleOfSlot(workflow.working),
    done: roleOfSlot(workflow.done),
    blocked: workflow.blocked.map(roleOfSlot).join(' '),
    review: workflow.review.map(roleOfSlot).join(' '),
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
  isTheme,
  slotOf,
  resolve,
  roleInfo,
  roleOfSlot,
  defaultLabel,
  themeCss,
  templateText,
  colorName,
  placeholders,
  fillPlaceholders,
};
