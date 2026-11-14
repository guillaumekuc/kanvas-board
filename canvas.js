// Read and edit Obsidian canvas boards safely, for the canvas-board skill. Ships with the canvas-board plugin.
// If the board is open in Obsidian, edits go through the plugin's API (`app.plugins.plugins['canvas-board'].api`,
// called with the Obsidian CLI `obsidian eval`) so Obsidian does not save its in-memory copy over them;
// otherwise the .canvas file is edited directly. The plugin requires this file for applyOps.
//
// Usage (paths relative to the vault root; CANVAS = node .obsidian/plugins/canvas-board/canvas.js):
//   CANVAS read <board>                       nodes and edges as JSON
//   CANVAS tree [<board>] [--active]          board + linked notes (level, parts) + nested canvases, as JSON
//                                             --active: go (cyan/purple)/orange cards, cards edged to them, yellow/red count
//   CANVAS set <board> <id> [--color c] [--text t] [--file path]
//                                             c: red orange yellow green cyan purple none (or 1-6)
//                                             --file turns the card into a file card, --text into a text card
//   CANVAS add <board> --near <id> --text t [--color c] [--width w] [--height h]
//                                             new text card next to <id> (right, else below); prints its id
//   CANVAS remove <board> <id>
//   CANVAS edge <board> <fromId> <toId> [--label l]
//   CANVAS layout <board> [--ids a,b,c] [--dir TB|LR|BT|RL] [--fit]
//                                             dagre layered layout of the given cards (default: all), the others
//                                             stay put; --fit sizes text cards to their text. For canvases an agent
//                                             made, or cards it just added
//   CANVAS pack <board> --ids a,b --name N    the cards (and cards inside selected groups) move to `N.canvas`
//                                             next to the board; one card `[[N.canvas|N]]` takes their place (alias: collapse)
//   CANVAS unpack <board> <id> [--keep]       the reverse; the subcanvas file goes to .trash, unless --keep or other
//                                             cards / notes still link it (then it stays, they are listed) (alias: expand)
//   CANVAS merge <board> --ids a,b            text cards into the first in reading order (most urgent color)
//   CANVAS split <board> <id> [--by b]        b: paragraph (default), bullet, h1..h6; pieces stack under it
//   CANVAS extract <board> <id> --text t      the text t leaves the card for a new card right of it, overlaps allowed
//   CANVAS archive <board> <id>[,id]          cards become notes in "<board> archive/" next to the board (setting "Archive":
//                                             or one folder for all boards, default Board notes/Archive/)
//   CANVAS restore <note>                     puts an archived card back on its board, note to .trash
//   CANVAS rollup [<board>]                  recolor parents from nested boards, update `· N inside` / `· Nd`
//   CANVAS check [<board>] [--ids a,b]        read-only: broken invariants (links, card text, plan notes) as JSON. --ids: only
//                                             the cards a pass wrote; without it, an audit of every colored card
// tree, rollup and check are the agent workflow: they live in workflow.js (go colors: plugin setting "Workflow").
// Default board: the plugin setting "Default board" (data.json), else Board.canvas. Default direction: the plugin setting "Layout direction" (data.json), else TB.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..', '..'); // <vault>/.obsidian/plugins/canvas-board
const DEFAULT_BOARD = 'Board.canvas';
const SKIP_DIRS = new Set(['.git', '.obsidian', '.trash', '_secrets', 'node_modules']);
const COLORS = { red: '1', orange: '2', yellow: '3', green: '4', cyan: '5', purple: '6' };

const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));

// Shared by both modes: runs in Node on the parsed file, or inside Obsidian (plugin) on canvas.getData().
function applyOps(d, ops) {
  const retyped = [];
  for (const o of ops) {
    if (o.op === 'set') {
      const n = d.nodes.find(n => n.id === o.id);
      if (!n) throw new Error('no node ' + o.id);
      if (o.color !== undefined) { if (o.color) n.color = o.color; else delete n.color; }
      if (o.file !== undefined) { if (n.type !== 'file') retyped.push(n.id); n.type = 'file'; n.file = o.file; delete n.text; }
      if (o.text !== undefined) { if (n.type !== 'text') retyped.push(n.id); n.type = 'text'; n.text = o.text; delete n.file; }
      for (const k of ['x', 'y', 'width', 'height']) if (o[k] !== undefined) n[k] = o[k];
    } else if (o.op === 'sides') {
      const e = d.edges.find(e => e.id === o.id);
      if (e) { e.fromSide = o.fromSide; e.toSide = o.toSide; }
    } else if (o.op === 'add') d.nodes.push(o.node);
    else if (o.op === 'remove') { d.nodes = d.nodes.filter(n => n.id !== o.id); d.edges = d.edges.filter(e => e.fromNode !== o.id && e.toNode !== o.id); }
    else if (o.op === 'edge') d.edges.push(o.edge);
    else if (o.op === 'retarget') { const e = d.edges.find(e => e.id === o.id); if (e) { e.fromNode = o.fromNode; e.toNode = o.toNode; } }
    else if (o.op === 'ends') { const e = d.edges.find(e => e.id === o.id); if (e) { e.fromEnd = o.fromEnd; e.toEnd = o.toEnd; } }
    else if (o.op === 'unedge') d.edges = d.edges.filter(e => e.id !== o.id);
  }
  return retyped;
}

// --- Refactor operations ------------------------------------------------------------------------------
// Pure: they return ops (and the other file's content when there is one); the CLI and the plugin write them.

const URGENCY = ['1', '3', '2', '5', '6', '4']; // red > yellow > orange > cyan > purple > green > none
const mostUrgent = colors => URGENCY.find(c => colors.includes(c)) || '';
const byReading = (a, b) => a.y - b.y || a.x - b.x;

// Cards inside a selected group come with it.
function withGroupMembers(d, ids) {
  const pick = new Set(ids);
  for (const g of d.nodes.filter(n => n.type === 'group' && pick.has(n.id)))
    for (const n of d.nodes) if (n.x >= g.x && n.y >= g.y && n.x + n.width <= g.x + g.width && n.y + n.height <= g.y + g.height) pick.add(n.id);
  return pick;
}

// Selected cards move to `file` (a new .canvas) at their relative places, with the edges between them; one card
// `[[file|label]]` takes their place, centered on where they were, and the edges that crossed the boundary now end on it.
const bounds = ns => {
  const x = Math.min(...ns.map(n => n.x)), y = Math.min(...ns.map(n => n.y));
  return { x, y, w: Math.max(...ns.map(n => n.x + n.width)) - x, h: Math.max(...ns.map(n => n.y + n.height)) - y };
};
function collapseOps(d, ids, file, label) {
  const pick = withGroupMembers(d, ids);
  const moving = d.nodes.filter(n => pick.has(n.id));
  if (!moving.length) throw new Error('nothing to collapse');
  const b = bounds(moving);
  const sub = {
    nodes: moving.map(n => ({ ...n, x: n.x - b.x, y: n.y - b.y })),
    edges: d.edges.filter(e => pick.has(e.fromNode) && pick.has(e.toNode)),
  };
  const W = 320, H = 60;
  const card = { id: newId(), type: 'text', text: `[[${file}|${label}]]`,
    x: Math.round(b.x + (b.w - W) / 2), y: Math.round(b.y + (b.h - H) / 2), width: W, height: H };
  const ops = [{ op: 'add', node: card }];
  for (const e of d.edges) {
    const from = pick.has(e.fromNode), to = pick.has(e.toNode);
    if (from !== to) ops.push({ op: 'retarget', id: e.id, fromNode: from ? card.id : e.fromNode, toNode: to ? card.id : e.toNode });
  }
  for (const n of moving) ops.push({ op: 'remove', id: n.id });
  return { ops, sub, id: card.id };
}

// The reverse (unpack): the subcanvas's cards come back centered on the card, shifted right until they overlap nothing;
// edges on the card go to the first of them in reading order. The caller trashes the .canvas file (dissolve) or
// keeps it (copy). With `group` (a label), a group is drawn around them and the edges on the card go to it.
function expandOps(d, id, sub, { group } = {}) {
  const card = d.nodes.find(n => n.id === id);
  if (!card) throw new Error('no node ' + id);
  if (!sub.nodes.length) throw new Error('empty subcanvas');
  const taken = new Set(d.nodes.map(n => n.id).concat(d.edges.map(e => e.id)));
  const ids = new Map(sub.nodes.map(n => [n.id, taken.has(n.id) ? newId() : n.id]));
  const b = bounds(sub.nodes);
  const others = d.nodes.filter(n => n.id !== id);
  let ox = Math.round(card.x + (card.width - b.w) / 2) - b.x;
  const oy = Math.round(card.y + (card.height - b.h) / 2) - b.y;
  const hits = () => sub.nodes.some(p => others.some(n => p.x + ox < n.x + n.width + 40 && p.x + ox + p.width + 40 > n.x && p.y + oy < n.y + n.height + 40 && p.y + oy + p.height + 40 > n.y));
  for (let k = 0; k < 200 && hits(); k++) ox += 40;
  const nodes = sub.nodes.map(n => ({ ...n, id: ids.get(n.id), x: n.x + ox, y: n.y + oy }));
  let first = nodes.filter(n => n.type !== 'group').sort(byReading)[0] || nodes[0];
  const ops = [];
  if (group) { // added first: drawn behind the cards
    const P = 30;
    const gx = Math.min(...nodes.map(n => n.x)) - P, gy = Math.min(...nodes.map(n => n.y)) - P;
    first = { id: newId(), type: 'group', label: group, x: gx, y: gy,
      width: Math.max(...nodes.map(n => n.x + n.width)) + P - gx, height: Math.max(...nodes.map(n => n.y + n.height)) + P - gy };
    ops.push({ op: 'add', node: first });
  }
  ops.push(...nodes.map(node => ({ op: 'add', node })));
  for (const e of sub.edges) ops.push({ op: 'edge', edge: { ...e, id: taken.has(e.id) ? newId() : e.id, fromNode: ids.get(e.fromNode), toNode: ids.get(e.toNode) } });
  for (const e of d.edges) if (e.fromNode === id || e.toNode === id)
    ops.push({ op: 'retarget', id: e.id, fromNode: e.fromNode === id ? first.id : e.fromNode, toNode: e.toNode === id ? first.id : e.toNode });
  ops.push({ op: 'remove', id });
  return group ? Object.assign(ops, { group: first.id }) : ops;
}

// Wikilinks (and embeds) in `text` whose target `hits(linkpath)` become `to(label)`; label = alias, else file name.
function relinkText(text, hits, to) {
  return (text || '').replace(/!?\[\[([^\]|#]+)(#[^\]|]*)?(?:\|([^\]]*))?\]\]/g, (m, target, sub, alias) =>
    hits(target.trim()) ? to(alias || path.posix.basename(target.trim()).replace(/\.canvas$/, '')) : m);
}

// Text cards become the first one (in reading order): texts joined by a blank line, the most urgent color,
// every edge; edges between them are dropped, edges to the same card become one.
function mergeOps(d, ids) {
  const cards = d.nodes.filter(n => ids.includes(n.id)).sort(byReading);
  if (cards.length < 2) throw new Error('merge needs 2+ cards');
  if (cards.some(n => n.type !== 'text')) throw new Error('merge takes text cards only');
  const [keep, ...rest] = cards;
  const gone = new Set(rest.map(n => n.id));
  const all = new Set(cards.map(n => n.id));
  const text = cards.map(n => n.text.trim()).join('\n\n');
  const width = Math.max(...cards.map(n => n.width));
  const ops = [{ op: 'set', id: keep.id, text, color: mostUrgent(cards.map(n => n.color || '')), width, height: fitHeight(text, width) }];
  // Edges to the same other card end up as one: a two-way edge if there was one or they went both ways,
  // else the one from the merged card closest to it.
  const center = n => [n.x + n.width / 2, n.y + n.height / 2];
  const dist = (a, b) => Math.hypot(center(a)[0] - center(b)[0], center(a)[1] - center(b)[1]);
  const twoWay = e => e.fromEnd === 'arrow' && e.toEnd !== 'none';
  const byOther = new Map();
  for (const e of d.edges) {
    if (!all.has(e.fromNode) && !all.has(e.toNode)) continue;
    if (all.has(e.fromNode) && all.has(e.toNode)) { if (gone.has(e.fromNode) || gone.has(e.toNode)) ops.push({ op: 'unedge', id: e.id }); continue; }
    const out = all.has(e.fromNode), other = out ? e.toNode : e.fromNode;
    const len = dist(d.nodes.find(n => n.id === (out ? e.fromNode : e.toNode)), d.nodes.find(n => n.id === other) || keep);
    if (!byOther.has(other)) byOther.set(other, []);
    byOther.get(other).push({ e, out, len });
  }
  for (const list of byOther.values()) {
    list.sort((a, b) => a.len - b.len);
    const best = list.find(x => twoWay(x.e)) || list[0];
    const both = list.some(x => x.out) && list.some(x => !x.out);
    for (const x of list) if (x !== best) ops.push({ op: 'unedge', id: x.e.id });
    const e = best.e;
    if (gone.has(e.fromNode) || gone.has(e.toNode))
      ops.push({ op: 'retarget', id: e.id, fromNode: gone.has(e.fromNode) ? keep.id : e.fromNode, toNode: gone.has(e.toNode) ? keep.id : e.toNode });
    if (both && !twoWay(e)) ops.push({ op: 'ends', id: e.id, fromEnd: 'arrow', toEnd: 'arrow' });
  }
  for (const n of rest) ops.push({ op: 'remove', id: n.id });
  return ops;
}

// by: paragraph (blank lines), bullet (top-level list items), h1..h6 (a new piece at each heading of that level).
function splitText(text, by) {
  const h = /^h([1-6])$/.exec(by);
  const starts = h ? new RegExp(`^#{${h[1]}} `) : by === 'bullet' ? /^([-*+]|\d+[.)]) / : null;
  const pieces = starts
    ? text.split('\n').reduce((acc, line) => { if (starts.test(line) || !acc.length) acc.push([]); acc[acc.length - 1].push(line); return acc; }, []).map(l => l.join('\n'))
    : text.split(/\n\s*\n/);
  return pieces.map(p => p.trim()).filter(Boolean);
}

// One text card becomes one card per piece, stacked under it; the first keeps the id, color and edges.
function splitOps(d, id, by = 'paragraph') {
  const card = d.nodes.find(n => n.id === id);
  if (!card || card.type !== 'text') throw new Error('split takes one text card');
  const pieces = splitText(card.text || '', by);
  if (pieces.length < 2) throw new Error(`nothing to split by ${by}`);
  let y = card.y;
  return pieces.map((text, i) => {
    const height = fitHeight(text, card.width);
    const node = { ...card, id: i ? newId() : card.id, text, y, height };
    y += height + 20;
    return i ? { op: 'add', node } : { op: 'set', id, text, height };
  });
}

// `part` (a piece of the card's text, e.g. the editor selection) leaves the card for a new card next to it.
function extractOps(d, id, part, from) {
  const card = d.nodes.find(n => n.id === id);
  if (!card || card.type !== 'text') throw new Error('extract takes one text card');
  const at = from !== undefined && card.text.slice(from, from + part.length) === part ? from : card.text.indexOf(part);
  if (!part.trim() || at < 0) throw new Error('text not found in the card');
  const left = (card.text.slice(0, at) + card.text.slice(at + part.length)).replace(/\n{3,}/g, '\n\n').trim();
  const text = part.trim();
  const height = fitHeight(text, card.width);
  // Right next to the card even if it overlaps another (seen beats tidy), on top of the stack (added last);
  // stepped down only so repeated extracts don't hide each other exactly.
  let y = card.y;
  while (d.nodes.some(n => n.x === card.x + card.width + 40 && n.y === y)) y += 40;
  const node = { id: newId(), type: 'text', text, x: card.x + card.width + 40, y, width: card.width, height };
  if (card.color) node.color = card.color;
  return [{ op: 'set', id, text: left, height: fitHeight(left, card.width) }, { op: 'add', node }];
}

// --- Templates ----------------------------------------------------------------------------------------
// A template is a .canvas file (Templates/Canvas/). Its cards get new ids and land with their top-left at `at`.

const TEMPLATE_DIR = 'Templates/Canvas';

function templateOps(tpl, at) {
  const nodes = tpl.nodes || [];
  if (!nodes.length) throw new Error('empty template');
  const x0 = Math.min(...nodes.map(n => n.x)), y0 = Math.min(...nodes.map(n => n.y));
  const ids = new Map(nodes.map(n => [n.id, newId()]));
  const ops = nodes.map(n => ({ op: 'add', node: { ...n, id: ids.get(n.id), x: n.x - x0 + at.x, y: n.y - y0 + at.y } }));
  for (const e of tpl.edges || []) if (ids.has(e.fromNode) && ids.has(e.toNode))
    ops.push({ op: 'edge', edge: { ...e, id: newId(), fromNode: ids.get(e.fromNode), toNode: ids.get(e.toNode) } });
  return ops;
}

// --- Archive ------------------------------------------------------------------------------------------
// An archived card becomes a note (body = its text, or a link to its file) whose frontmatter keeps what a
// restore needs: board, id, place, size, color and its edges. Listed by Canvas archive.base.

const ARCHIVE_DIR = 'Board notes/Archive'; // the folder for all boards (setting "Archive": global)

// Where a board's archive notes go: "<board name> archive" next to the board, or with the setting "Archive" on
// global, one folder for all boards (setting "Archive folder"). `s`: the plugin settings (data.json).
function archiveDir(board, s = {}) {
  if (s.archiveMode === 'global') return String(s.archiveFolder || ARCHIVE_DIR).trim().replace(/[/\\]+$/, '') || ARCHIVE_DIR;
  const b = String(board).replace(/\\/g, '/'), dir = path.posix.dirname(b);
  return (dir === '.' ? '' : dir + '/') + path.posix.basename(b, '.canvas') + ' archive';
}
const noteName = text => (String(text).split('\n').find(l => l.trim()) || 'Card')
  .replace(/^\s*([>#]+\s*|([-*+]|\d+[.)])\s+(\[.\]\s+)?)/, '').replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2').replace(/[#^|[\]*_`>:\\/"?<]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60).trim() || 'Card';
const yamlStr = s => JSON.stringify(String(s));

// Returns { name, content, ops }. `contexts`: the context of the note the archived card links, else G&A.
function archiveNote(d, id, board, date, contexts = ['G&A']) {
  const n = d.nodes.find(n => n.id === id);
  if (!n) throw new Error('no node ' + id);
  const edges = d.edges.filter(e => e.fromNode === id || e.toNode === id)
    .map(e => yamlStr([e.id, e.fromNode, e.fromSide || '', e.toNode, e.toSide || '', e.label || ''].join(' | ')));
  const fm = [
    '---', 'context:', ...contexts.map(c => `  - ${c}`),
    `archived-from: "[[${board}]]"`, `archived: ${date}`, `card-id: ${yamlStr(n.id)}`, `card-type: ${n.type}`,
    ...(n.type === 'file' ? [`card-file: ${yamlStr(n.file)}`] : []), ...(n.type === 'link' ? [`card-url: ${yamlStr(n.url)}`] : []),
    `x: ${n.x}`, `y: ${n.y}`, `width: ${n.width}`, `height: ${n.height}`, `color: ${yamlStr(n.color || '')}`,
    edges.length ? 'edges:' : 'edges: []', ...edges.map(e => `  - ${e}`), '---', '',
  ].join('\n');
  const body = n.type === 'text' ? n.text : n.type === 'file' ? `[[${n.file}]]` : n.type === 'link' ? n.url : n.label || '';
  return { name: noteName(n.type === 'text' ? n.text : n.file || n.url || n.label), content: fm + body + '\n', ops: [{ op: 'remove', id }] };
}

// Parses an archive note; returns { board, ops } that put the card back (same id if free) with the edges whose
// other end is still on the board.
function restoreOps(d, src) {
  const fm = (src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/) || [])[1];
  if (!fm || !/^archived-from:/m.test(fm)) throw new Error('not an archived card note');
  const get = k => { const m = new RegExp(`^${k}: (.*)$`, 'm').exec(fm); if (!m) return undefined; const v = m[1].trim(); return v.startsWith('"') ? JSON.parse(v) : v; };
  const board = get('archived-from').replace(/^\[\[|\]\]$/g, '');
  const body = src.slice(src.indexOf('---', 3) + 3).replace(/^\r?\n/, '').replace(/\s+$/, '');
  const type = get('card-type') || 'text';
  const ids = new Set(d.nodes.map(n => n.id));
  const id = ids.has(get('card-id')) ? newId() : get('card-id');
  const node = { id, type, x: Number(get('x')), y: Number(get('y')), width: Number(get('width')), height: Number(get('height')) };
  if (type === 'text') node.text = body;
  if (type === 'file') node.file = get('card-file');
  if (type === 'link') node.url = get('card-url');
  if (get('color')) node.color = get('color');
  const ops = [{ op: 'add', node }];
  const old = get('card-id');
  const edgeIds = new Set(d.edges.map(e => e.id));
  for (const m of fm.matchAll(/^ {2}- (".*")$/gm)) {
    const [eid, from, fromSide, to, toSide, label] = JSON.parse(m[1]).split(' | ');
    const fromNode = from === old ? id : from, toNode = to === old ? id : to;
    if (edgeIds.has(eid) || !(fromNode === id || ids.has(fromNode)) || !(toNode === id || ids.has(toNode))) continue;
    const edge = { id: eid, fromNode, toNode };
    if (fromSide) edge.fromSide = fromSide;
    if (toSide) edge.toSide = toSide;
    if (label) edge.label = label;
    ops.push({ op: 'edge', edge });
  }
  return { board, ops };
}

// --- Obsidian CLI -----------------------------------------------------------------------------------

// On PATH first (the CLI registers it there), then the default install of each platform.
const OBSIDIAN = ['obsidian', 'C:\\Program Files\\Obsidian\\Obsidian.com', '/Applications/Obsidian.app/Contents/MacOS/Obsidian'];

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

// Calls the plugin API inside Obsidian. 'closed' = board not open there; null = Obsidian not reachable.
const api = (fn, ...a) => obsidianEval(`(async()=>{const p=app.plugins.plugins['canvas-board'];if(!p||!p.api)return 'no plugin';` +
  `const r=await p.api.${fn}(${a.map(x => JSON.stringify(x)).join(',')});return r===null?'closed':r})()`);

// --- Board I/O ----------------------------------------------------------------------------------------

const abs = p => path.join(ROOT, p);
const readFileBoard = board => { const d = JSON.parse(fs.readFileSync(abs(board), 'utf8') || '{}'); d.nodes ||= []; d.edges ||= []; return d; };

function serialize(d) {
  const line = x => '\t\t' + JSON.stringify(x);
  return `{\n\t"nodes":[\n${d.nodes.map(line).join(',\n')}\n\t],\n\t"edges":[\n${d.edges.map(line).join(',\n')}\n\t]\n}\n`;
}

function readBoard(board) {
  const out = api('read', board);
  if (out && out.startsWith('{')) { const d = JSON.parse(out); return { nodes: d.nodes || [], edges: d.edges || [] }; }
  return readFileBoard(board);
}

function writeOps(board, ops) {
  const out = api('apply', board, ops);
  if (out === 'obsidian') return 'obsidian';
  if (out !== null && out !== 'closed') throw new Error(`Obsidian edit failed: ${out}`);
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

// Cards (any .canvas) and notes (.md) that link `rel`, except card `skipId` on `board`: ['path (card id)' | 'path'].
function linksTo(rel, board, skipId) {
  findFile('');
  const out = [];
  const hits = t => findFile(t) === rel;
  for (const f of new Set(fileIndex.values())) {
    if (f === rel || !/\.(md|canvas)$/.test(f)) continue;
    let src;
    try { src = fs.readFileSync(abs(f), 'utf8'); } catch (e) { continue; }
    if (!src.includes(path.posix.basename(rel))) continue;
    if (f.endsWith('.md')) { if (relinkText(src, hits, () => '\u0000') !== src) out.push(f); continue; }
    let d;
    try { d = JSON.parse(src || '{}'); } catch (e) { continue; }
    for (const n of d.nodes || []) if (!(f === board && n.id === skipId) &&
      (n.type === 'file' ? n.file === rel : relinkText(n.text, hits, () => '\u0000') !== (n.text || ''))) out.push(`${f} (${n.id})`);
  }
  return out;
}

function cardLinks(n) {
  const targets = n.type === 'file' ? [n.file] : [...(n.text || '').matchAll(/\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g)].map(m => findFile(m[1].trim()));
  const found = targets.filter(Boolean);
  return { note: found.find(f => f.endsWith('.md')) || null, canvas: found.find(f => f.endsWith('.canvas')) || null };
}

// Board + linked notes (path, age; `noteInfo(path)` adds more, workflow.js passes the level) + nested canvases.
function tree(board, { noteInfo } = {}, depth = 0, seen = new Set()) {
  seen.add(board);
  const d = readBoard(board);
  return {
    board,
    cards: d.nodes.filter(n => n.type !== 'group').map(n => {
      const { note, canvas } = cardLinks(n);
      const card = { id: n.id, color: n.color || null, text: n.type === 'text' ? n.text : undefined, file: n.file };
      if (note) {
        const ageDays = Math.floor((Date.now() - fs.statSync(abs(note)).mtimeMs) / 86400000);
        card.note = { path: note, ageDays, ...(noteInfo ? noteInfo(note) : {}) };
      }
      if (canvas && !seen.has(canvas) && depth < 2) card.inside = tree(canvas, { noteInfo }, depth + 1, seen);
      return card;
    }),
    edges: d.edges.map(e => ({ from: e.fromNode, to: e.toNode, label: e.label })),
  };
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

// --- Layout -------------------------------------------------------------------------------------------

const SIDES = { TB: ['bottom', 'top'], LR: ['right', 'left'], BT: ['top', 'bottom'], RL: ['left', 'right'] }; // edge [from, to] per direction
const settings = () => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8')); } catch (e) { return {}; } };
const defaultDir = () => (SIDES[settings().layoutDirection] ? settings().layoutDirection : 'TB');

// Height that fits a text card's markdown at Obsidian's default canvas font (~8px a char, 26px a line).
function fitHeight(text, w) {
  const perLine = Math.max(10, Math.floor((w - 40) / 8));
  const lines = String(text || '').split('\n').reduce((s, l) => s + Math.max(1, Math.ceil(l.replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2').length / perLine)), 0);
  return Math.max(60, lines * 26 + 34);
}

// Ops that lay out `ids` (all cards when empty) with dagre; the other cards never move. The laid-out block
// keeps the center of the cards it lays out, then steps until it overlaps nothing.
// Shared with the plugin, which passes its own dagre.
function layoutOps(d, { ids, dir = 'TB', fit = false, dagre, flow = 'out' }) {
  const cards = d.nodes.filter(n => n.type !== 'group');
  const pick = new Set(ids && ids.length ? ids : cards.map(n => n.id));
  const moving = cards.filter(n => pick.has(n.id));
  const fixed = cards.filter(n => !pick.has(n.id));
  if (!moving.length) return [];
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: dir, nodesep: 40, ranksep: 80, marginx: 0, marginy: 0 });
  g.setDefaultEdgeLabel(() => ({}));
  const size = n => ({ width: n.width, height: fit && n.type === 'text' ? fitHeight(n.text, n.width) : n.height });
  for (const n of moving) g.setNode(n.id, size(n));
  const inner = d.edges.filter(e => pick.has(e.fromNode) && pick.has(e.toNode));
  // The direction names where a branch starts, whichever way its arrows point. With flow 'in' (the fold direction)
  // arrows point at the card they hang from, and "depends on" edges point at the prerequisite: both come first, so they rank reversed.
  const back = e => flow === 'in' || /depends on/i.test(e.label || '');
  for (const e of inner) back(e) ? g.setEdge(e.toNode, e.fromNode) : g.setEdge(e.fromNode, e.toNode);
  dagre.layout(g);

  const box = ns => ns.reduce((b, n) => ({ x0: Math.min(b.x0, n.x), y0: Math.min(b.y0, n.y), x1: Math.max(b.x1, n.x + n.width), y1: Math.max(b.y1, n.y + n.height) }), { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
  const placed = moving.map(n => { const p = g.node(n.id); return { id: n.id, x: Math.round(p.x - p.width / 2), y: Math.round(p.y - p.height / 2), width: p.width, height: p.height }; });
  // The block keeps the center the moving cards had; if it then overlaps a fixed card, it steps across the
  // flow (down for LR and RL, right for TB and BT), alternating sides, to the nearest free spot.
  const b = box(placed), was = box(moving);
  const cx = Math.round((was.x0 + was.x1 - b.x0 - b.x1) / 2), cy = Math.round((was.y0 + was.y1 - b.y0 - b.y1) / 2);
  let ox = cx, oy = cy;
  const hits = () => placed.some(p => fixed.some(n => p.x + ox < n.x + n.width + 40 && p.x + ox + p.width + 40 > n.x && p.y + oy < n.y + n.height + 40 && p.y + oy + p.height + 40 > n.y));
  for (let k = 1; k <= 400 && hits(); k++) {
    const step = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 40;
    if (dir === 'LR' || dir === 'RL') oy = cy + step; else ox = cx + step;
  }

  const ops = placed.map(p => ({ op: 'set', id: p.id, x: p.x + ox, y: p.y + oy, width: p.width, height: p.height }));
  const [fromSide, toSide] = SIDES[dir];
  for (const e of inner) ops.push(back(e) ? { op: 'sides', id: e.id, fromSide: toSide, toSide: fromSide } : { op: 'sides', id: e.id, fromSide, toSide });
  return ops;
}

// Card text without Markdown syntax, one string per non-empty line, for lists (filter pane):
// [[Note|alias]] → alias, [[Note#Heading]] → Note › Heading, [[Note]] → Note, [text](url) → text; marks
// (** __ ~~ == ` * _), heading, quote, list and checkbox markers dropped; #tags kept.
function plainLines(text) {
  const name = n => n.replace(/\.(md|canvas)$/, '').split('/').pop();
  return String(text || '').split('\n').map(l => l
    .replace(/!?\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/!?\[\[([^\]#]*)#\^?([^\]]+)\]\]/g, (_, n, h) => n ? `${name(n)} › ${h}` : h)
    .replace(/!?\[\[([^\]]+)\]\]/g, (_, n) => name(n))
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(#{1,6}\s+|>\s*|[-*+]\s+(\[.\]\s+)?|\d+[.)]\s+)/, '')
    .replace(/\*\*|__|~~|==|`/g, '')
    .replace(/(^|\W)[*_](\S[^*_]*?)[*_](?=\W|$)/g, '$1$2')
    .replace(/\s+/g, ' ').trim()).filter(Boolean);
}

// readBoard … noteContexts are for workflow.js (tree --active, rollup, check).
module.exports = { readBoard, writeOps, tree, findFile, cardLinks, abs, noteContexts, COLORS, SIDES, plainLines, applyOps, layoutOps, collapseOps, expandOps, relinkText, mergeOps, splitOps, extractOps, archiveNote, archiveDir, restoreOps, noteName, ARCHIVE_DIR, templateOps, TEMPLATE_DIR };

// Next free `<dir>/<name><ext>` (vault-relative), adding " 2", " 3"... when taken.
function freePath(dir, name, ext) {
  for (let k = 1; ; k++) {
    const p = path.posix.join(dir, `${name}${k > 1 ? ' ' + k : ''}${ext}`);
    if (!fs.existsSync(abs(p))) return p;
  }
}

// Contexts in a note's frontmatter text: the `context:` list (or a single value).
function noteContexts(fm) {
  if (!fm) return [];
  const unq = s => s.trim().replace(/^(["'])(.*)\1$/, '$2');
  const m = /^context:[ \t]*(.*)((?:\r?\n[ \t]+-.*)*)/m.exec(fm);
  if (!m) return [];
  return (m[1].trim() ? m[1].replace(/^\[|\]$/g, '').split(',') : m[2].split(/\r?\n/).filter(l => l.trim()).map(l => l.replace(/^\s+-\s*/, '')))
    .map(unq).filter(Boolean);
}

// Context of the note a card links, to file its archive note under the same context.
function cardContexts(n) {
  const { note } = cardLinks(n);
  const fm = note && (fs.readFileSync(abs(note), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1];
  const c = noteContexts(fm);
  return c.length ? c : undefined;
}

const toTrash = rel => { const dest = abs(path.posix.join('.trash', path.posix.basename(rel))); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.renameSync(abs(rel), dest); };
const today = () => new Date().toISOString().slice(0, 10);

if (require.main === module) {
  const [cmd, boardArg, ...rest] = positional;
  const board = boardArg || String(settings().defaultBoard || '').trim() || DEFAULT_BOARD;
  const print = x => console.log(JSON.stringify(x, null, 2));

  switch (cmd) {
    case 'read': print(readBoard(board)); break;
    case 'tree': { const wf = require('./workflow.js'); print(args.includes('--active') ? wf.activeTree(wf.tree(board)) : wf.tree(board)); break; }
    case 'set': {
      const op = { op: 'set', id: rest[0], color: colorArg(opt('--color')) };
      if (opt('--text') !== undefined) op.text = opt('--text');
      if (opt('--file') !== undefined) op.file = opt('--file');
      console.log(writeOps(board, [op]));
      break;
    }
    case 'add': {
      const w = Number(opt('--width') || 320), h = Number(opt('--height') || fitHeight(opt('--text'), w));
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
      const [a, b] = SIDES[defaultDir()];
      const [fromSide, toSide] = /depends on/i.test(opt('--label') || '') ? [b, a] : [a, b];
      const edge = { id: newId(), fromNode: rest[0], fromSide, toNode: rest[1], toSide };
      if (opt('--label')) edge.label = opt('--label');
      console.log(writeOps(board, [{ op: 'edge', edge }]));
      break;
    }
    case 'layout': {
      const ids = (opt('--ids') || '').split(',').filter(Boolean);
      const dir = (opt('--dir') || defaultDir()).toUpperCase();
      if (!SIDES[dir]) { console.error(`layout: --dir must be TB, LR, BT or RL, not ${dir}`); process.exit(1); }
      const ops = layoutOps(readBoard(board), { ids, dir, fit: args.includes('--fit'), dagre: require('./dagre.min.js'), flow: settings().foldDirection });
      console.log(writeOps(board, ops), ops.filter(o => o.op === 'set').length, 'cards');
      break;
    }
    case 'pack':
    case 'collapse': {
      const name = opt('--name');
      if (!name) throw new Error('collapse needs --name');
      const file = freePath(path.posix.dirname(board), name, '.canvas');
      const { ops, sub, id } = collapseOps(readBoard(board), (opt('--ids') || '').split(',').filter(Boolean), file, name);
      fs.writeFileSync(abs(file), serialize(sub));
      writeOps(board, ops);
      console.log(file, id);
      break;
    }
    case 'unpack':
    case 'expand': {
      const card = readBoard(board).nodes.find(n => n.id === rest[0]);
      const sub = card && cardLinks(card).canvas;
      if (!sub) throw new Error('card links no canvas');
      const others = args.includes('--keep') ? [] : linksTo(sub, board, rest[0]);
      writeOps(board, expandOps(readBoard(board), rest[0], readBoard(sub)));
      if (args.includes('--keep')) console.log('unpacked (copy), kept', sub);
      else if (others.length) console.log('unpacked, kept', sub, '- still linked from:', others.join(', '));
      else { toTrash(sub); console.log('unpacked (dissolve), trashed', sub); }
      break;
    }
    case 'merge': console.log(writeOps(board, mergeOps(readBoard(board), (opt('--ids') || '').split(',').filter(Boolean)))); break;
    case 'split': console.log(writeOps(board, splitOps(readBoard(board), rest[0], opt('--by') || 'paragraph'))); break;
    case 'extract': console.log(writeOps(board, extractOps(readBoard(board), rest[0], opt('--text') || ''))); break;
    case 'archive': {
      const d = readBoard(board);
      const ids = rest[0].split(',');
      for (const id of ids) {
        const n = d.nodes.find(n => n.id === id);
        const a = archiveNote(d, id, board, today(), n && cardContexts(n));
        const dir = archiveDir(board, settings());
        const file = freePath(dir, a.name, '.md');
        fs.mkdirSync(abs(dir), { recursive: true });
        fs.writeFileSync(abs(file), a.content);
        console.log(file);
      }
      writeOps(board, ids.map(id => ({ op: 'remove', id })));
      break;
    }
    case 'restore': { // positional is the archive note, not a board
      const src = fs.readFileSync(abs(boardArg), 'utf8');
      const target = restoreOps({ nodes: [], edges: [] }, src).board;
      const { ops } = restoreOps(readBoard(target), src);
      console.log(writeOps(target, ops), target, ops[0].node.id);
      toTrash(boardArg);
      break;
    }
    case 'rollup': print(require('./workflow.js').rollup(board)); break;
    case 'check': print(require('./workflow.js').check(board, opt('--ids') ? new Set(opt('--ids').split(',')) : undefined)); break;
    default:
      console.error('Usage: node .obsidian/plugins/canvas-board/canvas.js read|tree|set|add|remove|edge|layout|pack|unpack|merge|split|extract|archive|restore|rollup|check <board> ... (see header)');
      process.exit(1);
  }
}
