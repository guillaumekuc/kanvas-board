import fileSystem from 'fs';
import path from 'path';
import * as notes from '../board/notes.js';
import * as store from '../board/store.js';
import * as config from './config.js';
import * as templateRules from './templateRules.js';

const LIST_SEPARATOR = /[\s,]+/;
const CANVAS_COLOR_NUMBER = /^[1-6]$/;
const ROLLUP_SUFFIXES = / · \d+ inside| · \d+d$/g;
const STALE_SUFFIX = / · \d+d$/;
const INSIDE_SUFFIX = / · \d+ inside/;
const FRONTMATTER = /^---\n([\s\S]*?)\n---/;
const FRONTMATTER_KEY = /^(\w[\w-]*):/gm;
const PART_CHECKBOX = /^\s*- \[([ xX])\] /gm;
const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;
const DECISIONS_RECORD = /^## Decisions Record/m;
const OPEN_QUESTION = /^\s*- \[\?\] /gm;

const ORANGE_STALE_MS = 3600000;
const DEFAULT_PASS_COLORS = 'cyan purple';
const DEFAULT_NOTES_FOLDER = config.DEFAULT_NOTES_FOLDER;

function escapeRegex(text) {
  return text.replace(REGEX_SPECIAL, '\\$&');
}

// active: the go and working colors; waiting: the colors counted as waiting
// on User (the blocked and review roles).
function activeNode(boardTree, total, colors) {
  const { active, waiting } = colors;
  const ids = new Set(
    boardTree.cards
      .filter((card) => active.has(card.color))
      .map((card) => card.id),
  );
  const near = new Set();
  for (const edge of boardTree.edges) {
    if (ids.has(edge.from) && !ids.has(edge.to)) {
      near.add(edge.to);
    }
    if (ids.has(edge.to) && !ids.has(edge.from)) {
      near.add(edge.from);
    }
  }
  const cards = [],
    context = [];
  for (const card of boardTree.cards) {
    if (waiting.has(card.color)) {
      total.waiting++;
    }
    const inside = card.inside && activeNode(card.inside, total, colors);
    if (ids.has(card.id) || (inside && inside.cards.length)) {
      cards.push({
        ...card,
        inside: inside && inside.cards.length ? inside : undefined,
      });
    } else if (near.has(card.id)) {
      context.push({
        id: card.id,
        color: card.color,
        text: card.text,
        file: card.file,
      });
    }
  }
  const kept = new Set(cards.map((card) => card.id));
  const edges = boardTree.edges.filter(
    (edge) => kept.has(edge.from) || kept.has(edge.to),
  );

  return { board: boardTree.board, cards, context, edges };
}

// "cyan purple" / "5,6" → Set of color numbers. Empty setting (all off): no go
// colors, the agent takes nothing.
function parseColors(value) {
  return new Set(
    String(value || '')
      .split(LIST_SEPARATOR)
      .filter(Boolean)
      .map((color) => store.COLORS[color.toLowerCase()] || color)
      .filter((color) => CANVAS_COLOR_NUMBER.test(color)),
  );
}

function settings() {
  try {
    return JSON.parse(
      fileSystem.readFileSync(path.join(store.PLUGIN_DIR, 'data.json'), 'utf8'),
    );
  } catch (error) {
    return {};
  }
}

// The user's workflow (config.js), read from data.json on each call.
function workflowNow() {
  return config.resolve(settings());
}

function goColors() {
  const value = settings().passColors;

  return parseColors(value === undefined ? DEFAULT_PASS_COLORS : value);
}

// `tree --active`: only what a pass needs. Go/orange cards with their notes,
// the cards edged to them (once each, text only, as context), nested boards
// only when they hold active cards, and the yellow/red count.
function activeTree(boardTree) {
  const workflow = workflowNow();
  const active = new Set([...goColors(), workflow.working]);
  const total = { waiting: 0 };
  const filtered = activeNode(boardTree, total, {
    active,
    waiting: workflow.waiting,
  });

  return {
    board: filtered.board,
    waiting: total.waiting,
    cards: filtered.cards,
    context: filtered.context,
    edges: filtered.edges,
  };
}

// Review cards (yellow by default) whose note has not changed for `days` show
// its age: `· Nd`.
function ageSuffixOperation(card, days, review = workflowNow().review) {
  const isAging =
    review.includes(card.color) &&
    card.note &&
    card.text !== undefined &&
    !card.inside;
  if (!isAging) {
    return null;
  }
  const base = card.text.replace(STALE_SUFFIX, '');
  const isStale = days > 0 && card.note.ageDays >= days;
  const text = isStale ? `${base} · ${card.note.ageDays}d` : base;

  return text === card.text ? null : { op: 'set', id: card.id, text };
}

const WIKILINK = /\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g;

// What a card links: its file, or the targets of the wikilinks in its text.
function cardLinkTargets(node) {
  if (node.type === 'file') {
    return [node.file];
  }

  return [...(node.text || '').matchAll(WIKILINK)].map((match) =>
    match[1].trim(),
  );
}

// Structure only, never content. A card the agent wrote: a wish (User's free
// text, any length, no link) or one of the card template's shapes (by default
// `[[Note]] · reason` or a recap `<words> · done · [[Output]]`).
function cardTextOk(raw, shapes = defaultCardShapes()) {
  const text = raw.trim();
  if (!text.includes('[[')) {
    return true;
  }

  return shapes.patterns.some((pattern) => pattern.test(text));
}

function defaultCardShapes() {
  return templateRules.cardShapes(config.templateText('card', workflowNow()));
}

function textShapesIssue(shapes) {
  const listed = shapes.lines.map((line) => `\`${line}\``).join(', ');

  return (
    'card text is neither a wish (no link) nor a card template shape ' +
    `(${listed})`
  );
}

// Broken links, and card text off the card template's shapes on the top board
// (plan-canvas cards are parts: free text).
function cardIssues(node, depth, shapes = defaultCardShapes()) {
  const issues = cardLinkTargets(node)
    .filter((link) => !store.findFile(link))
    .map((link) => `broken link [[${link}]]`);
  const isTopText = node.type === 'text' && depth === 0;
  if (isTopText && !cardTextOk(node.text || '', shapes)) {
    issues.push(textShapesIssue(shapes));
  }

  return issues;
}

// A working card (orange by default) whose note nobody touched for a while: a
// pass that stopped.
function isStaleOrange(node, note, working = workflowNow().working) {
  if (node.color !== working) {
    return false;
  }

  const age = Date.now() - fileSystem.statSync(store.vaultPath(note)).mtimeMs;

  return age > ORANGE_STALE_MS;
}

function defaultNoteRules() {
  const workflow = workflowNow();

  return {
    shape: templateRules.noteShape(config.templateText('note', workflow)),
    done: workflow.done,
  };
}

// A plan note's shape, from the plan-note template: its frontmatter keys only
// (one context when the template has `context`), its required headings, and
// the "when done" ones once the card has the done color.
function noteIssues(source, color, rules = defaultNoteRules()) {
  const { shape, done } = rules;
  const frontmatter = (source.match(FRONTMATTER) || [])[1];
  const keys = frontmatter
    ? [...frontmatter.matchAll(FRONTMATTER_KEY)].map((match) => match[1])
    : [];
  function hasHeading(heading) {
    const headingLine = new RegExp(`^${heading}\\s*$`, 'm');

    return headingLine.test(source);
  }
  const issues = [];
  const expected = shape.keys.join(', ');
  if (keys.join(', ') !== expected) {
    const listed = keys.join(', ') || 'none';
    issues.push(`note frontmatter is not \`${expected}\` only (${listed})`);
  }
  const isOneContext = shape.keys.includes('context');
  if (isOneContext && notes.noteContexts(frontmatter).length !== 1) {
    issues.push('note does not have exactly one context');
  }
  for (const heading of shape.required) {
    if (!hasHeading(escapeRegex(heading.line))) {
      const where = heading.parent ? ` (under ${heading.parent})` : '';
      issues.push(`note has no ${heading.line}${where}`);
    }
  }
  const isDone = Boolean(done) && color === done;
  for (const heading of isDone ? shape.whenDone : []) {
    if (!hasHeading(escapeRegex(heading.line))) {
      issues.push(
        `${config.colorName(done)} card, note has no ${heading.line}`,
      );
    }
  }

  return issues;
}

function notesFolder() {
  return `${workflowNow().notesFolder}/`;
}

const MAX_DEPTH = 2;

function staleIssue(working) {
  const name = config.colorName(working);

  return `${name} card, note untouched for 1h+ (interrupted pass?)`;
}

// ids: the cards a pass worked on. The check constrains what agents write,
// not what User does with the cards afterwards (merged cards, headings), so a
// pass passes its inventory plus the cards it added. Interrupted passes
// (stale orange) are always reported. Without ids: every colored card, as an
// audit.
function check(board, ids) {
  const workflow = workflowNow();
  const folder = `${workflow.notesFolder}/`;
  const shapes = templateRules.cardShapes(
    config.templateText('card', workflow),
  );
  const noteRules = {
    shape: templateRules.noteShape(config.templateText('note', workflow)),
    done: workflow.done,
  };
  // the template and instructions notes sit in the notes folder by default
  const templates = new Set([
    workflow.cardTemplate,
    workflow.noteTemplate,
    workflow.instructions,
  ]);
  const issues = [];
  const seen = new Set();
  function walk(current, depth) {
    seen.add(current);
    const colored = store
      .readBoard(current)
      .nodes.filter((node) => node.type !== 'group' && node.color);
    for (const node of colored) {
      const isScoped = !ids || ids.has(node.id);
      const { note, canvas } = notes.cardLinks(node);
      const isPlanNote = Boolean(
        note && note.startsWith(folder) && !templates.has(note),
      );
      const isStale = isPlanNote && isStaleOrange(node, note, workflow.working);
      const found = [
        ...(isScoped ? cardIssues(node, depth, shapes) : []),
        ...(isScoped && isPlanNote
          ? noteIssues(store.readOrNull(note) || '', node.color, noteRules)
          : []),
        ...(isStale ? [staleIssue(workflow.working)] : []),
      ];
      const text = (node.text || node.file || '').split('\n')[0];
      issues.push(
        ...found.map((issue) => ({ board: current, id: node.id, text, issue })),
      );
      if (canvas && !seen.has(canvas) && depth < MAX_DEPTH) {
        walk(canvas, depth + 1);
      }
    }
  }
  walk(board, 0);

  return { issues };
}

// Per waiting color (blocked first, then review, each in canvas order) how
// many cards have it; allDone: every card has the done color.
function colorCounts(colors, workflow = workflowNow()) {
  function count(color) {
    return colors.filter((each) => each === color).length;
  }
  const urgency = [...workflow.blocked, ...workflow.review];

  return {
    waiting: urgency.map((color) => [color, count(color)]),
    total: urgency.reduce((sum, color) => sum + count(color), 0),
    allDone:
      Boolean(workflow.done) &&
      colors.length > 0 &&
      count(workflow.done) === colors.length,
  };
}

// The most urgent waiting color inside (or the card's own, when User or an
// agent set it) climbs; a rolled-up card whose inside is resolved takes the
// done color when everything inside is done, else no color.
function desiredColor(card, inner, rules) {
  const { goColors, workflow } = rules;
  if (goColors.has(card.color)) {
    return card.color;
  }

  const rolled = card.text !== undefined && INSIDE_SUFFIX.test(card.text);
  const own = rolled ? null : card.color;
  const climbing = inner.waiting.find(
    ([color, count]) => count || own === color,
  );
  if (climbing) {
    return climbing[0];
  }
  if (rolled && workflow.waiting.has(card.color)) {
    return inner.allDone ? workflow.done : null;
  }

  return card.color || null;
}

// A card linking a nested board takes its most urgent color and the count of
// waiting cards inside as `· N inside` (any `· Nd` age goes).
// rules: { goColors, workflow }.
function nestedCardUpdate(card, inner, rules) {
  const color = desiredColor(card, inner, rules);
  const waiting = inner.total;
  const text =
    card.text === undefined
      ? undefined
      : card.text.replace(ROLLUP_SUFFIXES, '') +
        (waiting ? ` · ${waiting} inside` : '');
  const isTextChanged = text !== card.text;
  if (color === card.color && !isTextChanged) {
    return { color: card.color, operation: null };
  }
  const operation = {
    op: 'set',
    id: card.id,
    color: color === null ? '' : color,
  };
  if (isTextChanged) {
    operation.text = text;
  }

  return { color, operation };
}

// Level is derived from the note: `- [ ]` / `- [x]` parts make it a plan,
// otherwise it is a brief. Questions: `- [?]` lines above the Decisions
// Record heading (past rounds). Built in: the agent instructions say how to
// write them, a vault that wants other markers writes its own tooling.
function noteState(relativePath) {
  const text = fileSystem.readFileSync(store.vaultPath(relativePath), 'utf8');
  const parts = [...text.matchAll(PART_CHECKBOX)];
  const done = parts.filter((match) => match[1] !== ' ').length;
  // answered rounds don't count
  const open = text.split(DECISIONS_RECORD)[0];
  const questions = [...open.matchAll(OPEN_QUESTION)].length;

  return {
    level: parts.length ? 'plan' : 'brief',
    parts: { done, total: parts.length },
    questions,
  };
}

function staleDays() {
  const days = Number(settings().staleDays);

  return Number.isFinite(days) && settings().staleDays !== undefined ? days : 7;
} // plugin setting "Stale after"

function tree(board) {
  return notes.tree(board, { noteInfo: noteState });
}

// red > yellow are the "needs me" colors that climb to the parent card; go
// colors are human choices and are never overwritten. The card color is the
// only state: a red/yellow card with a `· N inside` suffix got its color from
// the roll-up, one without it was set by an agent or User and is kept.
// Nested boards are written before the boards that link them.
function rollup(board) {
  const workflow = workflowNow();
  const goColorSet = goColors();
  const days = staleDays();
  const changes = [];
  function walk(node) {
    const operations = [];
    const colors = node.cards.map((card) => {
      if (!card.inside) {
        return card.color;
      }

      const inner = walk(card.inside);
      const update = nestedCardUpdate(card, inner, {
        goColors: goColorSet,
        workflow,
      });
      if (update.operation) {
        operations.push(update.operation);
      }

      return update.color;
    });
    const ages = node.cards.map((card) =>
      ageSuffixOperation(card, days, workflow.review),
    );
    operations.push(...ages.filter(Boolean));
    if (operations.length) {
      const via = store.writeOps(node.board, operations);
      changes.push({ board: node.board, via, operations });
    }

    return colorCounts(colors, workflow);
  }
  walk(tree(board));

  return changes;
}

export {
  ORANGE_STALE_MS,
  DEFAULT_PASS_COLORS,
  DEFAULT_NOTES_FOLDER,
  activeNode,
  parseColors,
  settings,
  workflowNow,
  goColors,
  activeTree,
  ageSuffixOperation,
  cardLinkTargets,
  cardTextOk,
  cardIssues,
  isStaleOrange,
  noteIssues,
  notesFolder,
  check,
  colorCounts,
  desiredColor,
  nestedCardUpdate,
  noteState,
  staleDays,
  tree,
  rollup,
};
