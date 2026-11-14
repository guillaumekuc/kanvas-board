const { DEFAULT_BOARD, SIDES } = require('../board/constants.js');
const activeTree = require('../workflow/activeTree.js');
const check = require('../workflow/check.js');
const rollup = require('../workflow/rollup.js');
const workflowTree = require('../workflow/tree.js');
const abs = require('../board/abs.js');
const archiveDir = require('../board/archiveDir.js');
const archiveNote = require('../board/archiveNote.js');
const cardContexts = require('../board/cardContexts.js');
const cardLinks = require('../board/cardLinks.js');
const collapseOps = require('../board/collapseOps.js');
const colorArg = require('../board/colorArg.js');
const defaultDir = require('../board/defaultDir.js');
const expandOps = require('../board/expandOps.js');
const extractOps = require('../board/extractOps.js');
const fitHeight = require('../board/fitHeight.js');
const freePath = require('../board/freePath.js');
const fs = require('fs');
const layoutOps = require('../board/layoutOps.js');
const linksTo = require('../board/linksTo.js');
const mergeOps = require('../board/mergeOps.js');
const newId = require('../board/newId.js');

const path = require('path');
const place = require('../board/place.js');
const readBoard = require('../board/readBoard.js');
const restoreOps = require('../board/restoreOps.js');
const serialize = require('../board/serialize.js');
const settings = require('../board/settings.js');
const splitOps = require('../board/splitOps.js');
const today = require('../board/today.js');
const toTrash = require('../board/toTrash.js');
const writeOps = require('../board/writeOps.js');

const args = process.argv.slice(2);
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };

{
  const [cmd, boardArg, ...rest] = positional;
  const board = boardArg || String(settings().defaultBoard || '').trim() || DEFAULT_BOARD;
  const print = x => console.log(JSON.stringify(x, null, 2));

  switch (cmd) {
    case 'read': print(readBoard(board)); break;
    case 'tree': print(args.includes('--active') ? activeTree(workflowTree(board)) : workflowTree(board)); break;
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
      const ops = layoutOps(readBoard(board), { ids, dir, fit: args.includes('--fit'), dagre: require('../../dagre.min.js'), flow: settings().foldDirection });
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
    case 'rollup': print(rollup(board)); break;
    case 'check': print(check(board, opt('--ids') ? new Set(opt('--ids').split(',')) : undefined)); break;
    default:
      console.error('Usage: node .obsidian/plugins/canvas-board/canvas.js read|tree|set|add|remove|edge|layout|pack|unpack|merge|split|extract|archive|restore|rollup|check <board> ... (see header)');
      process.exit(1);
  }
}
