import fileSystem from 'fs';
import dagre from '../../dagre.min.js';
import path from 'path';
import { fitHeight, place, defaultDir, layoutOps } from '../board/geometry.js';
import {
  colorArg,
  archiveDir,
  archiveNote,
  cardContexts,
  restoreOps,
  cardLinks,
  linksTo,
} from '../board/notes.js';
import {
  extractOps,
  mergeOps,
  collapseOps,
  splitOps,
  expandOps,
} from '../board/refactor.js';
import {
  newId,
  readBoard,
  writeOps,
  freePath,
  settings,
  today,
  vaultPath,
  SIDES,
  serialize,
  toTrash,
} from '../board/store.js';
import {
  check,
  rollup,
  activeTree,
  tree as workflowTree,
} from '../workflow/workflow.js';

const DEPENDS_ON_LABEL = /depends on/i;

const DEFAULT_WIDTH = 320;

function addCommand(cli) {
  const text = cli.option('--text') || '';
  const width = Number(cli.option('--width') || DEFAULT_WIDTH);
  const height = Number(
    cli.option('--height') || fitHeight(cli.option('--text'), width),
  );
  const near = cli.option('--near');
  const { x: left, y: top } = place(readBoard(cli.board), {
    near,
    width,
    height,
  });
  const node = {
    id: newId(),
    type: 'text',
    text,
    x: left,
    y: top,
    width,
    height,
  };
  const color = colorArg(cli.option('--color'));
  if (color) {
    node.color = color;
  }
  writeOps(cli.board, [{ op: 'add', node }]);
  console.log(node.id);
}

function archiveCommand(cli) {
  const { board } = cli;
  const canvasData = readBoard(board);
  const ids = cli.rest[0].split(',');
  for (const id of ids) {
    const node = canvasData.nodes.find((each) => each.id === id);
    const contexts = (node && cardContexts(node)) || settings().archiveContexts;
    const date = today();
    const archived = archiveNote(canvasData, { id, board, date, contexts });
    const folder = archiveDir(board, settings());
    const file = freePath(folder, archived.name, '.md');
    fileSystem.mkdirSync(vaultPath(folder), { recursive: true });
    fileSystem.writeFileSync(vaultPath(file), archived.content);
    console.log(file);
  }
  writeOps(
    board,
    ids.map((id) => ({ op: 'remove', id })),
  );
}

function checkCommand(cli) {
  const ids = cli.option('--ids') ? new Set(cli.list('--ids')) : undefined;
  cli.print(check(cli.board, ids));
}

// A "depends on" edge points at the prerequisite, against the flow.
function edgeCommand(cli) {
  const label = cli.option('--label');
  const [flowFrom, flowTo] = SIDES[defaultDir()];
  const isAgainstFlow = DEPENDS_ON_LABEL.test(label || '');
  const [fromSide, toSide] = isAgainstFlow
    ? [flowTo, flowFrom]
    : [flowFrom, flowTo];
  const [fromNode, toNode] = cli.rest;
  const edge = { id: newId(), fromNode, fromSide, toNode, toSide };
  if (label) {
    edge.label = label;
  }
  console.log(writeOps(cli.board, [{ op: 'edge', edge }]));
}

function extractCommand(cli) {
  const operations = extractOps(readBoard(cli.board), {
    id: cli.rest[0],
    part: cli.option('--text') || '',
  });
  console.log(writeOps(cli.board, operations));
}

function readCommand(cli) {
  cli.print(readBoard(cli.board));
}

function treeCommand(cli) {
  const boardTree = workflowTree(cli.board);
  cli.print(cli.hasFlag('--active') ? activeTree(boardTree) : boardTree);
}

function setCommand(cli) {
  const operation = {
    op: 'set',
    id: cli.rest[0],
    color: colorArg(cli.option('--color')),
  };
  if (cli.option('--text') !== undefined) {
    operation.text = cli.option('--text');
  }
  if (cli.option('--file') !== undefined) {
    operation.file = cli.option('--file');
  }
  console.log(writeOps(cli.board, [operation]));
}

function removeCommand(cli) {
  console.log(writeOps(cli.board, [{ op: 'remove', id: cli.rest[0] }]));
}

function layoutCommand(cli) {
  const direction = (cli.option('--dir') || defaultDir()).toUpperCase();
  if (!SIDES[direction]) {
    console.error(`layout: --dir must be TB, LR, BT or RL, not ${direction}`);
    process.exit(1);
  }
  const operations = layoutOps(readBoard(cli.board), {
    ids: cli.list('--ids'),
    direction,
    isFitToText: cli.hasFlag('--fit'),
    dagre,
    flow: settings().foldDirection,
  });
  const moved = operations.filter((operation) => operation.op === 'set');
  console.log(writeOps(cli.board, operations), moved.length, 'cards');
}

function packCommand(cli) {
  const name = cli.option('--name');
  if (!name) {
    throw new Error('collapse needs --name');
  }
  const file = freePath(path.posix.dirname(cli.board), name, '.canvas');
  const { operations, subcanvas, id } = collapseOps(readBoard(cli.board), {
    ids: cli.list('--ids'),
    file,
    label: name,
  });
  fileSystem.writeFileSync(vaultPath(file), serialize(subcanvas));
  writeOps(cli.board, operations);
  console.log(file, id);
}

// The subcanvas file goes to the trash unless --keep, or other cards and
// notes still link it.
function unpackCommand(cli) {
  const [id] = cli.rest;
  const card = readBoard(cli.board).nodes.find((node) => node.id === id);
  const subcanvas = card && cardLinks(card).canvas;
  if (!subcanvas) {
    throw new Error('card links no canvas');
  }
  const isKept = cli.hasFlag('--keep');
  const others = isKept ? [] : linksTo(subcanvas, cli.board, id);
  const operations = expandOps(readBoard(cli.board), {
    id,
    subcanvas: readBoard(subcanvas),
  });
  writeOps(cli.board, operations);
  if (isKept) {
    return console.log('unpacked (copy), kept', subcanvas);
  }
  if (others.length) {
    const linking = others.join(', ');
    console.log('unpacked, kept', subcanvas, '- still linked from:', linking);
    return;
  }
  toTrash(subcanvas);
  console.log('unpacked (dissolve), trashed', subcanvas);
}

function mergeCommand(cli) {
  const operations = mergeOps(readBoard(cli.board), cli.list('--ids'));
  console.log(writeOps(cli.board, operations));
}

function splitCommand(cli) {
  const separator = cli.option('--by') || 'paragraph';
  const operations = splitOps(readBoard(cli.board), cli.rest[0], separator);
  console.log(writeOps(cli.board, operations));
}

// The first argument is the archive note, not a board: the note says which
// board the card goes back to.
function restoreCommand(cli) {
  const note = cli.boardArg;
  const source = fileSystem.readFileSync(vaultPath(note), 'utf8');
  const target = restoreOps({ nodes: [], edges: [] }, source).board;
  const { operations } = restoreOps(readBoard(target), source);
  console.log(writeOps(target, operations), target, operations[0].node.id);
  toTrash(note);
}

function rollupCommand(cli) {
  cli.print(rollup(cli.board));
}

// Command pattern: each canvas.js command name (and its alias) maps to the
// function that runs it.
const commands = {
  read: readCommand,
  tree: treeCommand,
  set: setCommand,
  add: addCommand,
  remove: removeCommand,
  edge: edgeCommand,
  layout: layoutCommand,
  pack: packCommand,
  unpack: unpackCommand,
  merge: mergeCommand,
  split: splitCommand,
  extract: extractCommand,
  archive: archiveCommand,
  restore: restoreCommand,
  rollup: rollupCommand,
  check: checkCommand,
  collapse: packCommand,
  expand: unpackCommand,
};

export {
  addCommand,
  archiveCommand,
  checkCommand,
  edgeCommand,
  extractCommand,
  readCommand,
  treeCommand,
  setCommand,
  removeCommand,
  layoutCommand,
  packCommand,
  unpackCommand,
  mergeCommand,
  splitCommand,
  restoreCommand,
  rollupCommand,
  commands,
};
