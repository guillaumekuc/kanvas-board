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
const fileSystem = require('fs');
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
const positional = args.filter((argument, index) => !argument.startsWith('--') && !(index > 0 && args[index - 1].startsWith('--')));
const option = name => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };

{
  const [cmd, boardArg, ...rest] = positional;
  const board = boardArg || String(settings().defaultBoard || '').trim() || DEFAULT_BOARD;
  const print = x => console.log(JSON.stringify(x, null, 2));

  switch (cmd) {
    case 'read': print(readBoard(board)); break;
    case 'tree': print(args.includes('--active') ? activeTree(workflowTree(board)) : workflowTree(board)); break;
    case 'set': {
      const operation = { op: 'set', id: rest[0], color: colorArg(option('--color')) };
      if (option('--text') !== undefined) operation.text = option('--text');
      if (option('--file') !== undefined) operation.file = option('--file');
      console.log(writeOps(board, [operation]));
      break;
    }
    case 'add': {
      const width = Number(option('--width') || 320), height = Number(option('--height') || fitHeight(option('--text'), width));
      const position = place(readBoard(board), option('--near'), width, height);
      const node = { id: newId(), type: 'text', text: option('--text') || '', x: position.x, y: position.y, width: width, height: height };
      const color = colorArg(option('--color'));
      if (color) node.color = color;
      writeOps(board, [{ op: 'add', node }]);
      console.log(node.id);
      break;
    }
    case 'remove': console.log(writeOps(board, [{ op: 'remove', id: rest[0] }])); break;
    case 'edge': {
      const [fromSideDefault, toSideDefault] = SIDES[defaultDir()];
      const [fromSide, toSide] = /depends on/i.test(option('--label') || '') ? [toSideDefault, fromSideDefault] : [fromSideDefault, toSideDefault];
      const edge = { id: newId(), fromNode: rest[0], fromSide, toNode: rest[1], toSide };
      if (option('--label')) edge.label = option('--label');
      console.log(writeOps(board, [{ op: 'edge', edge }]));
      break;
    }
    case 'layout': {
      const ids = (option('--ids') || '').split(',').filter(Boolean);
      const direction = (option('--dir') || defaultDir()).toUpperCase();
      if (!SIDES[direction]) { console.error(`layout: --dir must be TB, LR, BT or RL, not ${direction}`); process.exit(1); }
      const operations = layoutOps(readBoard(board), { ids, direction, fit: args.includes('--fit'), dagre: require('../../dagre.min.js'), flow: settings().foldDirection });
      console.log(writeOps(board, operations), operations.filter(operation => operation.op === 'set').length, 'cards');
      break;
    }
    case 'pack':
    case 'collapse': {
      const name = option('--name');
      if (!name) throw new Error('collapse needs --name');
      const file = freePath(path.posix.dirname(board), name, '.canvas');
      const { operations, sub, id } = collapseOps(readBoard(board), (option('--ids') || '').split(',').filter(Boolean), file, name);
      fileSystem.writeFileSync(abs(file), serialize(sub));
      writeOps(board, operations);
      console.log(file, id);
      break;
    }
    case 'unpack':
    case 'expand': {
      const card = readBoard(board).nodes.find(node => node.id === rest[0]);
      const sub = card && cardLinks(card).canvas;
      if (!sub) throw new Error('card links no canvas');
      const others = args.includes('--keep') ? [] : linksTo(sub, board, rest[0]);
      writeOps(board, expandOps(readBoard(board), rest[0], readBoard(sub)));
      if (args.includes('--keep')) console.log('unpacked (copy), kept', sub);
      else if (others.length) console.log('unpacked, kept', sub, '- still linked from:', others.join(', '));
      else { toTrash(sub); console.log('unpacked (dissolve), trashed', sub); }
      break;
    }
    case 'merge': console.log(writeOps(board, mergeOps(readBoard(board), (option('--ids') || '').split(',').filter(Boolean)))); break;
    case 'split': console.log(writeOps(board, splitOps(readBoard(board), rest[0], option('--by') || 'paragraph'))); break;
    case 'extract': console.log(writeOps(board, extractOps(readBoard(board), rest[0], option('--text') || ''))); break;
    case 'archive': {
      const canvasData = readBoard(board);
      const ids = rest[0].split(',');
      for (const id of ids) {
        const node = canvasData.nodes.find(node => node.id === id);
        const archived = archiveNote(canvasData, id, board, today(), node && cardContexts(node));
        const folder = archiveDir(board, settings());
        const file = freePath(folder, archived.name, '.md');
        fileSystem.mkdirSync(abs(folder), { recursive: true });
        fileSystem.writeFileSync(abs(file), archived.content);
        console.log(file);
      }
      writeOps(board, ids.map(id => ({ op: 'remove', id })));
      break;
    }
    case 'restore': { // positional is the archive note, not a board
      const source = fileSystem.readFileSync(abs(boardArg), 'utf8');
      const target = restoreOps({ nodes: [], edges: [] }, source).board;
      const { operations } = restoreOps(readBoard(target), source);
      console.log(writeOps(target, operations), target, operations[0].node.id);
      toTrash(boardArg);
      break;
    }
    case 'rollup': print(rollup(board)); break;
    case 'check': print(check(board, option('--ids') ? new Set(option('--ids').split(',')) : undefined)); break;
    default:
      console.error('Usage: node .obsidian/plugins/canvas-board/canvas.js read|tree|set|add|remove|edge|layout|pack|unpack|merge|split|extract|archive|restore|rollup|check <board> ... (see header)');
      process.exit(1);
  }
}
