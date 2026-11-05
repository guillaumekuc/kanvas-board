// The agent workflow on top of canvas.js: what a pass reads (tree --active, note level), the roll-up and the
// check. canvas.js keeps the generic board ops and calls this file for those three commands; the plugin does
// not need it. Go colors (the cards a pass takes) come from the plugin setting "Workflow" (data.json).
const fs = require('fs');
const path = require('path');
const { readBoard, writeOps, tree: baseTree, findFile, cardLinks, abs, noteContexts, COLORS } = require('./canvas.js');

const staleDays = () => { const n = Number(settings().staleDays); return Number.isFinite(n) && settings().staleDays !== undefined ? n : 7; }; // plugin setting "Stale after"
const ORANGE_STALE_MS = 3600000;
const DEFAULT_PASS_COLORS = 'cyan purple';
const WORKING = '2'; // orange: a pass is on the card
const WAITING = new Set(['1', '3']); // red, yellow: needs the human

const settings = () => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8')); } catch (e) { return {}; } };

// "cyan purple" / "5,6" → Set of color numbers. Empty setting (pass always runs) keeps the default go colors here.
function parseColors(s) {
  return new Set(String(s || '').split(/[\s,]+/).filter(Boolean).map(c => COLORS[c.toLowerCase()] || c).filter(c => /^[1-6]$/.test(c)));
}
function goColors() {
  const s = settings().passColors;
  const set = parseColors(s === undefined ? DEFAULT_PASS_COLORS : s);
  return set.size ? set : parseColors(DEFAULT_PASS_COLORS);
}

// Level is derived from the note: `- [ ]` / `- [x]` parts make it a plan, otherwise it is a brief.
// Questions: `- [?]` above `## Decisions Record` (past rounds).
function noteState(rel) {
  const text = fs.readFileSync(abs(rel), 'utf8');
  const parts = [...text.matchAll(/^\s*- \[([ xX])\] /gm)];
  const done = parts.filter(m => m[1] !== ' ').length;
  const questions = [...text.split(/^## Decisions Record/m)[0].matchAll(/^\s*- \[\?\] /gm)].length; // answered rounds don't count
  return { level: parts.length ? 'plan' : 'brief', parts: { done, total: parts.length }, questions };
}

const tree = board => baseTree(board, { noteInfo: noteState });

// --active: only what a pass needs. Go/orange cards with their notes, the cards edged to them (once each,
// text only, as context), nested boards only when they hold active cards, and the yellow/red count.
function activeTree(t) {
  const active = new Set([...goColors(), WORKING]);
  const total = { waiting: 0 };
  const a = activeNode(t, total, active);
  return { board: a.board, waiting: total.waiting, cards: a.cards, context: a.context, edges: a.edges };
}

function activeNode(t, total, active) {
  const ids = new Set(t.cards.filter(c => active.has(c.color)).map(c => c.id));
  const near = new Set();
  for (const e of t.edges) {
    if (ids.has(e.from) && !ids.has(e.to)) near.add(e.to);
    if (ids.has(e.to) && !ids.has(e.from)) near.add(e.from);
  }
  const cards = [], context = [];
  for (const c of t.cards) {
    if (WAITING.has(c.color)) total.waiting++;
    const inside = c.inside && activeNode(c.inside, total, active);
    if (ids.has(c.id) || (inside && inside.cards.length)) cards.push({ ...c, inside: inside && inside.cards.length ? inside : undefined });
    else if (near.has(c.id)) context.push({ id: c.id, color: c.color, text: c.text, file: c.file });
  }
  const kept = new Set(cards.map(c => c.id));
  const edges = t.edges.filter(e => kept.has(e.from) || kept.has(e.to));
  return { board: t.board, cards, context, edges };
}

// --- Roll-up ------------------------------------------------------------------------------------------

// red > yellow are the "needs me" colors that climb to the parent card; go colors are human choices and are
// never overwritten. The card color is the only state: a red/yellow card with a `· N inside` suffix got its
// color from the roll-up, one without it was set by an agent or User and is kept.
function rollup(board) {
  const go = goColors();
  const t = tree(board);
  const changes = [];
  const walk = node => {
    const ops = [];
    let red = 0, yellow = 0, cards = 0, green = 0;
    for (const c of node.cards) {
      let color = c.color;
      if (c.inside) {
        const inner = walk(c.inside);
        const want = desiredColor(c, inner, go);
        let text = c.text;
        if (text !== undefined) {
          text = text.replace(/ · \d+ inside| · \d+d$/g, '');
          if (inner.red + inner.yellow) text += ` · ${inner.red + inner.yellow} inside`;
        }
        if (want !== color || (text !== undefined && text !== c.text)) {
          ops.push({ op: 'set', id: c.id, color: want === null ? '' : want, ...(text !== c.text ? { text } : {}) });
          color = want;
        }
      }
      if (color === '1') red++;
      if (color === '3') yellow++;
      cards++;
      if (color === '4') green++;
    }
    // Age suffix on yellow cards whose note has not changed for a week.
    for (const c of node.cards) {
      if (c.color !== '3' || !c.note || c.text === undefined || c.inside) continue;
      const base = c.text.replace(/ · \d+d$/, '');
      const days = staleDays();
      const text = days > 0 && c.note.ageDays >= days ? `${base} · ${c.note.ageDays}d` : base;
      if (text !== c.text) ops.push({ op: 'set', id: c.id, text });
    }
    if (ops.length) changes.push({ board: node.board, via: writeOps(node.board, ops), ops });
    return { red, yellow, allGreen: cards > 0 && green === cards };
  };
  walk(t);
  return changes;
}

function desiredColor(card, inner, go) {
  if (go.has(card.color)) return card.color;
  const rolled = card.text !== undefined && / · \d+ inside/.test(card.text);
  const own = rolled ? null : card.color;
  if (inner.red || own === '1') return '1';
  if (inner.yellow || own === '3') return '3';
  if (rolled && (card.color === '1' || card.color === '3')) return inner.allGreen ? '4' : null;
  return card.color || null;
}

// --- Check --------------------------------------------------------------------------------------------

// Structure only, never content: the invariants the skill and SOP state. A check that never fires in a month
// gets deleted; a new one only after the same defect shows up twice.
function check(board) {
  const issues = [];
  const walk = (b, depth, seen) => {
    seen.add(b);
    const d = readBoard(b);
    for (const n of d.nodes) {
      if (n.type === 'group' || !n.color) continue;
      const add = issue => issues.push({ board: b, id: n.id, text: (n.text || n.file || '').split('\n')[0], issue });
      const links = n.type === 'file' ? [n.file] : [...(n.text || '').matchAll(/\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g)].map(m => m[1].trim());
      for (const l of links) if (!findFile(l)) add(`broken link [[${l}]]`);
      if (n.type === 'text' && depth === 0) { // plan-canvas cards are parts, free text
        const text = n.text || '';
        if (text.includes('[[') ? !/^\[\[[^\]]+\]\]( · .+)?$/.test(text) : text.split('\n').length > 3) add('card text is neither a wish (≤ 3 lines) nor `[[Note]] · reason`');
      }
      const { note, canvas } = cardLinks(n);
      if (note && note.startsWith('Projects/_assets/plans/')) {
        const src = fs.readFileSync(abs(note), 'utf8');
        const fm = (src.match(/^---\n([\s\S]*?)\n---/) || [])[1];
        const keys = fm ? [...fm.matchAll(/^(\w[\w-]*):/gm)].map(m => m[1]) : [];
        if (keys.join() !== 'context') add(`note frontmatter is not \`context\` only (${keys.join(', ') || 'none'})`);
        if (noteContexts(fm).length !== 1) add('note does not have exactly one context');
        for (const s of ['Aim', 'Design']) if (!new RegExp(`^## ${s}\\s*$`, 'm').test(src)) add(`note has no ## ${s}`);
        if (!/^### Done when\s*$/m.test(src)) add('note has no ### Done when (under Aim)');
        if (n.color === '4' && !/^## Output\s*$/m.test(src)) add('green card, note has no ## Output');
        if (n.color === WORKING && Date.now() - fs.statSync(abs(note)).mtimeMs > ORANGE_STALE_MS) add('orange card, note untouched for 1h+ (interrupted pass?)');
      }
      if (canvas && !seen.has(canvas) && depth < 2) walk(canvas, depth + 1, seen);
    }
  };
  walk(board, 0, new Set());
  return { issues };
}

module.exports = { tree, activeTree, rollup, check, noteState, goColors, parseColors, DEFAULT_PASS_COLORS };
