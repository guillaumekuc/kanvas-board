// Read and edit Obsidian canvas boards safely, for the canvas-board skill.
// If the board is open in Obsidian, edits go through the Obsidian CLI (`obsidian eval`) so Obsidian
// does not save its in-memory copy over them; otherwise the .canvas file is edited directly.
//
// Usage (paths relative to the vault root):
//   node _scripts/canvas.js read <board>                       nodes and edges as JSON
//   node _scripts/canvas.js tree [<board>]                     board + linked notes (level, parts) + nested canvases, as JSON
//   node _scripts/canvas.js set <board> <id> [--color c] [--text t] [--file path]
//                                                              c: red orange yellow green cyan purple none (or 1-6)
//                                                              --file turns the card into a file card, --text into a text card
//   node _scripts/canvas.js add <board> --near <id> --text t [--color c] [--width w] [--height h]
//                                                              new text card next to <id> (right, else below); prints its id
//   node _scripts/canvas.js remove <board> <id>
//   node _scripts/canvas.js edge <board> <fromId> <toId> [--label l]
//   node _scripts/canvas.js rollup [<board>]                   recolor parents from nested boards, update `· N inside` / `· Nd`
// Default board: Plans.canvas.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_BOARD = 'Plans.canvas';
const SKIP_DIRS = new Set(['.git', '.obsidian', '.trash', '_secrets', 'node_modules']);
const COLORS = { red: '1', orange: '2', yellow: '3', green: '4', cyan: '5', purple: '6' };
const STALE_DAYS = 7;

const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));

// Shared by both modes: runs in Node on the parsed file, or inside Obsidian on canvas.getData().
const APPLY_SRC = `function applyOps(d, ops) {
  const retyped = [];
  for (const o of ops) {
    if (o.op === 'set') {
      const n = d.nodes.find(n => n.id === o.id);
      if (!n) throw new Error('no node ' + o.id);
      if (o.color !== undefined) { if (o.color) n.color = o.color; else delete n.color; }
      if (o.file !== undefined) { if (n.type !== 'file') retyped.push(n.id); n.type = 'file'; n.file = o.file; delete n.text; }
      if (o.text !== undefined) { if (n.type !== 'text') retyped.push(n.id); n.type = 'text'; n.text = o.text; delete n.file; }
    } else if (o.op === 'add') d.nodes.push(o.node);
    else if (o.op === 'remove') { d.nodes = d.nodes.filter(n => n.id !== o.id); d.edges = d.edges.filter(e => e.fromNode !== o.id && e.toNode !== o.id); }
    else if (o.op === 'edge') d.edges.push(o.edge);
  }
  return retyped;
}`;
const applyOps = new Function(`${APPLY_SRC}; return applyOps;`)();

// --- Obsidian CLI -----------------------------------------------------------------------------------

const OBSIDIAN = ['obsidian', 'C:\\Program Files\\Obsidian\\Obsidian.com'];

function obsidianEval(code) {
  for (const bin of OBSIDIAN) {
    try {
      const out = execFileSync(bin, ['eval', `code=${code}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      const m = out.match(/=>\s?([\s\S]*)$/);
      if (!m) throw new Error(out.trim());
      return m[1].trim();
    } catch (e) {
      if (e.code === 'ENOENT') continue;
      return null; // Obsidian not running, or the CLI is off
    }
  }
  return null;
}

const leafExpr = board => `app.workspace.getLeavesOfType('canvas').find(l=>l.view.file&&l.view.file.path===${JSON.stringify(board)})`;

function isOpen(board) {
  return obsidianEval(`String(!!(${leafExpr(board)}))`) === 'true';
}

// --- Board I/O ----------------------------------------------------------------------------------------

const abs = p => path.join(ROOT, p);
const readFileBoard = board => JSON.parse(fs.readFileSync(abs(board), 'utf8'));

function serialize(d) {
  const line = x => '\t\t' + JSON.stringify(x);
  return `{\n\t"nodes":[\n${d.nodes.map(line).join(',\n')}\n\t],\n\t"edges":[\n${d.edges.map(line).join(',\n')}\n\t]\n}\n`;
}

function readBoard(board) {
  if (isOpen(board)) {
    const out = obsidianEval(`JSON.stringify(${leafExpr(board)}.view.canvas.getData())`);
    if (out) { const d = JSON.parse(out); return { nodes: d.nodes, edges: d.edges }; }
  }
  return readFileBoard(board);
}

function writeOps(board, ops) {
  if (isOpen(board)) {
    const code = `(async()=>{${APPLY_SRC};const c=${leafExpr(board)}.view.canvas;const d=c.getData();const ops=${JSON.stringify(ops)};` +
      `const retyped=applyOps(d,ops);if(retyped.length)c.setData({...d,nodes:d.nodes.filter(n=>!retyped.includes(n.id))});` +
      `c.setData(d);c.requestSave();await new Promise(r=>setTimeout(r,2500));return 'obsidian'})()`;
    const out = obsidianEval(code);
    if (out !== 'obsidian') throw new Error(`Obsidian edit failed: ${out}`);
    return 'obsidian';
  }
  const d = readFileBoard(board);
  applyOps(d, ops);
  fs.writeFileSync(abs(board), serialize(d));
  return 'file';
}

// --- Links and notes --------------------------------------------------------------------------------

let fileIndex = null;
function findFile(name) {
  if (!fileIndex) {
    fileIndex = new Map();
    const walk = dir => {
      for (const e of fs.readdirSync(abs(dir), { withFileTypes: true })) {
        if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(path.posix.join(dir, e.name)); continue; }
        const rel = path.posix.join(dir, e.name);
        const key = e.name.endsWith('.md') ? e.name.slice(0, -3) : e.name;
        if (!fileIndex.has(key)) fileIndex.set(key, rel);
        fileIndex.set(rel, rel);
        fileIndex.set(rel.replace(/\.md$/, ''), rel);
      }
    };
    walk('');
  }
  return fileIndex.get(name) || null;
}

function cardLinks(n) {
  const targets = n.type === 'file' ? [n.file] : [...(n.text || '').matchAll(/\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g)].map(m => findFile(m[1].trim()));
  const found = targets.filter(Boolean);
  return { note: found.find(f => f.endsWith('.md')) || null, canvas: found.find(f => f.endsWith('.canvas')) || null };
}

// Level is derived from the note: `- [ ]` / `- [x]` parts make it a plan, otherwise it is a brief.
function noteState(rel) {
  const text = fs.readFileSync(abs(rel), 'utf8');
  const parts = [...text.matchAll(/^\s*- \[([ xX])\] /gm)];
  const done = parts.filter(m => m[1] !== ' ').length;
  const questions = [...text.matchAll(/^\s*- \[\?\] /gm)].length;
  return { level: parts.length ? 'plan' : 'brief', parts: { done, total: parts.length }, questions };
}

function tree(board, depth = 0, seen = new Set()) {
  seen.add(board);
  const d = readBoard(board);
  return {
    board,
    cards: d.nodes.filter(n => n.type !== 'group').map(n => {
      const { note, canvas } = cardLinks(n);
      const card = { id: n.id, color: n.color || null, text: n.type === 'text' ? n.text : undefined, file: n.file };
      if (note) {
        const ageDays = Math.floor((Date.now() - fs.statSync(abs(note)).mtimeMs) / 86400000);
        card.note = { path: note, ageDays, ...noteState(note) };
      }
      if (canvas && !seen.has(canvas) && depth < 2) card.inside = tree(canvas, depth + 1, seen);
      return card;
    }),
    edges: d.edges.map(e => ({ from: e.fromNode, to: e.toNode, label: e.label })),
  };
}

// --- Roll-up ------------------------------------------------------------------------------------------

// red > yellow are the "needs me" colors that climb to the parent card; cyan and purple (go) are human
// choices and are never overwritten. The card color is the only state: a red/yellow card with a `· N inside`
// suffix got its color from the roll-up, one without it was set by an agent or Guillaume and is kept.
function rollup(board) {
  const t = tree(board);
  const changes = [];
  const walk = node => {
    const ops = [];
    let red = 0, yellow = 0, cards = 0, green = 0;
    for (const c of node.cards) {
      let color = c.color;
      if (c.inside) {
        const inner = walk(c.inside);
        const want = desiredColor(c, inner);
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
      const text = c.note.ageDays >= STALE_DAYS ? `${base} · ${c.note.ageDays}d` : base;
      if (text !== c.text) ops.push({ op: 'set', id: c.id, text });
    }
    if (ops.length) changes.push({ board: node.board, via: writeOps(node.board, ops), ops });
    return { red, yellow, allGreen: cards > 0 && green === cards };
  };
  walk(t);
  return changes;
}

function desiredColor(card, inner) {
  if (card.color === '5' || card.color === '6') return card.color;
  const rolled = card.text !== undefined && / · \d+ inside/.test(card.text);
  const own = rolled ? null : card.color;
  if (inner.red || own === '1') return '1';
  if (inner.yellow || own === '3') return '3';
  if (rolled && (card.color === '1' || card.color === '3')) return inner.allGreen ? '4' : null;
  return card.color || null;
}

// --- Commands -----------------------------------------------------------------------------------------

const colorArg = c => (c === undefined ? undefined : c === 'none' ? '' : COLORS[c] || c);
const newId = () => [...Array(16)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

function place(d, near, w, h) {
  const p = d.nodes.find(n => n.id === near);
  if (!p) throw new Error('no node ' + near);
  const overlaps = (x, y) => d.nodes.some(n => x < n.x + n.width + 20 && x + w + 20 > n.x && y < n.y + n.height + 20 && y + h + 20 > n.y);
  for (let k = 0; k < 20; k++) {
    const right = { x: p.x + p.width + 40, y: p.y + k * (h + 40) };
    if (!overlaps(right.x, right.y)) return right;
    const below = { x: p.x + k * (w + 40), y: p.y + p.height + 40 };
    if (!overlaps(below.x, below.y)) return below;
  }
  return { x: p.x + p.width + 40, y: p.y };
}

const [cmd, boardArg, ...rest] = positional;
const board = boardArg || DEFAULT_BOARD;
const print = x => console.log(JSON.stringify(x, null, 2));

switch (cmd) {
  case 'read': print(readBoard(board)); break;
  case 'tree': print(tree(board)); break;
  case 'set': {
    const op = { op: 'set', id: rest[0], color: colorArg(opt('--color')) };
    if (opt('--text') !== undefined) op.text = opt('--text');
    if (opt('--file') !== undefined) op.file = opt('--file');
    console.log(writeOps(board, [op]));
    break;
  }
  case 'add': {
    const w = Number(opt('--width') || 320), h = Number(opt('--height') || 80);
    const pos = place(readBoard(board), opt('--near'), w, h);
    const node = { id: newId(), type: 'text', text: opt('--text') || '', x: pos.x, y: pos.y, width: w, height: h };
    const c = colorArg(opt('--color'));
    if (c) node.color = c;
    writeOps(board, [{ op: 'add', node }]);
    console.log(node.id);
    break;
  }
  case 'remove': console.log(writeOps(board, [{ op: 'remove', id: rest[0] }])); break;
  case 'edge': {
    const edge = { id: newId(), fromNode: rest[0], fromSide: 'bottom', toNode: rest[1], toSide: 'top' };
    if (opt('--label')) edge.label = opt('--label');
    console.log(writeOps(board, [{ op: 'edge', edge }]));
    break;
  }
  case 'rollup': print(rollup(board)); break;
  default:
    console.error('Usage: node _scripts/canvas.js read|tree|set|add|remove|edge|rollup <board> ... (see header)');
    process.exit(1);
}
