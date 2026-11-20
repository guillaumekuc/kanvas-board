import fileSystem from 'fs';
import path from 'path';
import { cardLinks, noteContexts, tree as baseTree } from '../board/notes.js';
import {
  findFile,
  readOrNull,
  readBoard,
  vaultPath,
  COLORS,
  PLUGIN_DIR,
  writeOps,
} from '../board/store.js';

const LIST_SEPARATOR = /[\s,]+/;
const CANVAS_COLOR_NUMBER = /^[1-6]$/;
const ROLLUP_SUFFIXES = / · \d+ inside| · \d+d$/g;
const STALE_SUFFIX = / · \d+d$/;
const INSIDE_SUFFIX = / · \d+ inside/;
const NOTE_CARD_TEXT = /^\[\[[^\]]+\]\]( · .+)?$/;
const DONE_CARD_TEXT = /^[^\n]+ · done · \[\[[^\]]+\]\]$/;
const FRONTMATTER = /^---\n([\s\S]*?)\n---/;
const FRONTMATTER_KEY = /^(\w[\w-]*):/gm;
const TRAILING_SLASHES = /[/]+$/;
const PART_CHECKBOX = /^\s*- \[([ xX])\] /gm;
const DECISIONS_RECORD_HEADING = /^## Decisions Record/m;
const OPEN_QUESTION = /^\s*- \[\?\] /gm;

const ORANGE_STALE_MS = 3600000;
const DEFAULT_PASS_COLORS = 'cyan purple';
const DEFAULT_NOTES_FOLDER = 'Board notes';
const WORKING = '2'; // orange: a pass is on the card
const WAITING = new Set(['1', '3']); // red, yellow: needs the human

function activeNode(boardTree, total, active) {
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
    if (WAITING.has(card.color)) {
      total.waiting++;
    }
    const inside = card.inside && activeNode(card.inside, total, active);
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
      .map((color) => COLORS[color.toLowerCase()] || color)
      .filter((color) => CANVAS_COLOR_NUMBER.test(color)),
  );
}

function settings() {
  try {
    return JSON.parse(
      fileSystem.readFileSync(path.join(PLUGIN_DIR, 'data.json'), 'utf8'),
    );
  } catch (error) {
    return {};
  }
}

function goColors() {
  const value = settings().passColors;
  return parseColors(value === undefined ? DEFAULT_PASS_COLORS : value);
}

// `tree --active`: only what a pass needs. Go/orange cards with their notes,
// the cards edged to them (once each, text only, as context), nested boards
// only when they hold active cards, and the yellow/red count.
function activeTree(boardTree) {
  const active = new Set([...goColors(), WORKING]);
  const total = { waiting: 0 };
  const filtered = activeNode(boardTree, total, active);
  return {
    board: filtered.board,
    waiting: total.waiting,
    cards: filtered.cards,
    context: filtered.context,
    edges: filtered.edges,
  };
}

// Yellow cards whose note has not changed for `days` show its age: `· Nd`.
function ageSuffixOperation(card, days) {
  const isAging =
    card.color === '3' && card.note && card.text !== undefined && !card.inside;
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

// Structure only, never content: the invariants the skill states. A check that
// never fires in a month gets deleted; a new one only after the same defect
// shows up twice. A card the agent wrote: a wish (≤ 3 lines), `[[Note]] ·
// reason`, or a recap `<words> · done · [[Output]]`.
function cardTextOk(raw) {
  const text = raw.trim();
  if (!text.includes('[[')) {
    return text.split('\n').length <= 3;
  }
  return NOTE_CARD_TEXT.test(text) || DONE_CARD_TEXT.test(text);
}

const TEXT_SHAPES =
  'card text is neither a wish (≤ 3 lines), `[[Note]] · reason` ' +
  'nor `<recap> · done · [[Output]]`';

// Broken links, and card text off the ladder's shapes on the top board
// (plan-canvas cards are parts: free text).
function cardIssues(node, depth) {
  const issues = cardLinkTargets(node)
    .filter((link) => !findFile(link))
    .map((link) => `broken link [[${link}]]`);
  const isTopText = node.type === 'text' && depth === 0;
  if (isTopText && !cardTextOk(node.text || '')) {
    issues.push(TEXT_SHAPES);
  }
  return issues;
}

// An orange card whose note nobody touched for a while: a pass that stopped.
function isStaleOrange(node, note) {
  if (node.color !== WORKING) {
    return false;
  }
  const age = Date.now() - fileSystem.statSync(vaultPath(note)).mtimeMs;
  return age > ORANGE_STALE_MS;
}

const REQUIRED_SECTIONS = ['Aim', 'Design'];

// A plan note's shape: `context` as the only property, one context, the
// required sections, and ## Output once the card is green.
function noteIssues(source, color) {
  const frontmatter = (source.match(FRONTMATTER) || [])[1];
  const keys = frontmatter
    ? [...frontmatter.matchAll(FRONTMATTER_KEY)].map((match) => match[1])
    : [];
  function hasHeading(heading) {
    const headingLine = new RegExp(`^${heading}\s*$`, 'm');
    return headingLine.test(source);
  }
  const issues = [];
  if (keys.join() !== 'context') {
    const listed = keys.join(', ') || 'none';
    issues.push(`note frontmatter is not \`context\` only (${listed})`);
  }
  if (noteContexts(frontmatter).length !== 1) {
    issues.push('note does not have exactly one context');
  }
  for (const section of REQUIRED_SECTIONS) {
    if (!hasHeading(`## ${section}`)) {
      issues.push(`note has no ## ${section}`);
    }
  }
  if (!hasHeading('### Done when')) {
    issues.push('note has no ### Done when (under Aim)');
  }
  if (color === '4' && !hasHeading('## Output')) {
    issues.push('green card, note has no ## Output');
  }
  return issues;
}

function notesFolder() {
  return (
    String(settings().notesFolder || DEFAULT_NOTES_FOLDER).replace(
      TRAILING_SLASHES,
      '',
    ) + '/'
  );
}

const MAX_DEPTH = 2;
const STALE = 'orange card, note untouched for 1h+ (interrupted pass?)';

// ids: the cards a pass worked on. The check constrains what agents write,
// not what User does with the cards afterwards (merged cards, headings), so a
// pass passes its inventory plus the cards it added. Interrupted passes
// (stale orange) are always reported. Without ids: every colored card, as an
// audit.
function check(board, ids) {
  const folder = notesFolder();
  const issues = [];
  const seen = new Set();
  function walk(current, depth) {
    seen.add(current);
    const colored = readBoard(current).nodes.filter(
      (node) => node.type !== 'group' && node.color,
    );
    for (const node of colored) {
      const isScoped = !ids || ids.has(node.id);
      const { note, canvas } = cardLinks(node);
      const isPlanNote = Boolean(note && note.startsWith(folder));
      const found = [
        ...(isScoped ? cardIssues(node, depth) : []),
        ...(isScoped && isPlanNote
          ? noteIssues(readOrNull(note) || '', node.color)
          : []),
        ...(isPlanNote && isStaleOrange(node, note) ? [STALE] : []),
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

const RED = '1';
const YELLOW = '3';
const GREEN = '4';

function colorCounts(colors) {
  function count(color) {
    return colors.filter((each) => each === color).length;
  }
  return {
    red: count(RED),
    yellow: count(YELLOW),
    allGreen: colors.length > 0 && count(GREEN) === colors.length,
  };
}

function desiredColor(card, inner, goColors) {
  if (goColors.has(card.color)) {
    return card.color;
  }
  const rolled = card.text !== undefined && INSIDE_SUFFIX.test(card.text);
  const own = rolled ? null : card.color;
  if (inner.red || own === '1') {
    return '1';
  }
  if (inner.yellow || own === '3') {
    return '3';
  }
  if (rolled && (card.color === '1' || card.color === '3')) {
    return inner.allGreen ? '4' : null;
  }
  return card.color || null;
}

// A card linking a nested board takes its most urgent color and the count of
// red / yellow cards inside as `· N inside` (any `· Nd` age goes).
function nestedCardUpdate(card, inner, goColorSet) {
  const color = desiredColor(card, inner, goColorSet);
  const waiting = inner.red + inner.yellow;
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
// otherwise it is a brief. Questions: `- [?]` above `## Decisions Record` (past
// rounds).
function noteState(relativePath) {
  const text = fileSystem.readFileSync(vaultPath(relativePath), 'utf8');
  const parts = [...text.matchAll(PART_CHECKBOX)];
  const done = parts.filter((match) => match[1] !== ' ').length;
  const questions = [
    ...text.split(DECISIONS_RECORD_HEADING)[0].matchAll(OPEN_QUESTION),
  ].length; // answered rounds don't count
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
  return baseTree(board, { noteInfo: noteState });
}

// red > yellow are the "needs me" colors that climb to the parent card; go
// colors are human choices and are never overwritten. The card color is the
// only state: a red/yellow card with a `· N inside` suffix got its color from
// the roll-up, one without it was set by an agent or User and is kept.
// Nested boards are written before the boards that link them.
function rollup(board) {
  const goColorSet = goColors();
  const days = staleDays();
  const changes = [];
  function walk(node) {
    const operations = [];
    const colors = node.cards.map((card) => {
      if (!card.inside) {
        return card.color;
      }
      const update = nestedCardUpdate(card, walk(card.inside), goColorSet);
      if (update.operation) {
        operations.push(update.operation);
      }
      return update.color;
    });
    const ages = node.cards.map((card) => ageSuffixOperation(card, days));
    operations.push(...ages.filter(Boolean));
    if (operations.length) {
      const via = writeOps(node.board, operations);
      changes.push({ board: node.board, via, operations });
    }
    return colorCounts(colors);
  }
  walk(tree(board));
  return changes;
}

export {
  ORANGE_STALE_MS,
  DEFAULT_PASS_COLORS,
  DEFAULT_NOTES_FOLDER,
  WORKING,
  WAITING,
  activeNode,
  parseColors,
  settings,
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
