import fileSystem from 'fs';
import dagre from '../../dagre.min.js';
import path from 'path';
import * as geometry from '../board/geometry.js';
import * as notes from '../board/notes.js';
import * as refactor from '../board/refactor.js';
import * as store from '../board/store.js';
import * as config from '../workflow/config.js';
import * as workflow from '../workflow/workflow.js';

const DEPENDS_ON_LABEL = /depends on/i;

const DEFAULT_WIDTH = 320;

function addCommand(cli) {
  const text = cli.option('--text') || '';
  const width = Number(cli.option('--width') || DEFAULT_WIDTH);
  const height = Number(
    cli.option('--height') || geometry.fitHeight(cli.option('--text'), width),
  );
  const near = cli.option('--near');
  const { x: left, y: top } = geometry.place(store.readBoard(cli.board), {
    near,
    width,
    height,
  });
  const node = {
    id: store.newId(),
    type: 'text',
    text,
    x: left,
    y: top,
    width,
    height,
  };
  const color = notes.colorArg(cli.option('--color'));
  if (color) {
    node.color = color;
  }
  store.writeOps(cli.board, [{ op: 'add', node }]);
  console.log(node.id);
}

function archiveCommand(cli) {
  const { board } = cli;
  const canvasData = store.readBoard(board);
  const ids = cli.rest[0].split(',');
  for (const id of ids) {
    const node = canvasData.nodes.find((each) => each.id === id);
    const contexts =
      (node && notes.cardContexts(node)) || store.settings().archiveContexts;
    const date = store.today();
    const archived = notes.archiveNote(canvasData, {
      id,
      board,
      date,
      contexts,
    });
    const folder = notes.archiveDir(board, store.settings());
    const file = store.freePath(folder, archived.name, '.md');
    fileSystem.mkdirSync(store.vaultPath(folder), { recursive: true });
    fileSystem.writeFileSync(store.vaultPath(file), archived.content);
    console.log(file);
  }
  store.writeOps(
    board,
    ids.map((id) => ({ op: 'remove', id })),
  );
}

function checkCommand(cli) {
  const ids = cli.option('--ids') ? new Set(cli.list('--ids')) : undefined;
  cli.print(workflow.check(cli.board, ids));
}

// A "depends on" edge points at the prerequisite, against the flow.
function edgeCommand(cli) {
  const label = cli.option('--label');
  const [flowFrom, flowTo] = store.SIDES[geometry.defaultDir()];
  const isAgainstFlow = DEPENDS_ON_LABEL.test(label || '');
  const [fromSide, toSide] = isAgainstFlow
    ? [flowTo, flowFrom]
    : [flowFrom, flowTo];
  const [fromNode, toNode] = cli.rest;
  const edge = { id: store.newId(), fromNode, fromSide, toNode, toSide };
  if (label) {
    edge.label = label;
  }
  console.log(store.writeOps(cli.board, [{ op: 'edge', edge }]));
}

function extractCommand(cli) {
  const operations = refactor.extractOps(store.readBoard(cli.board), {
    id: cli.rest[0],
    part: cli.option('--text') || '',
  });
  console.log(store.writeOps(cli.board, operations));
}

function readCommand(cli) {
  cli.print(store.readBoard(cli.board));
}

function treeCommand(cli) {
  const boardTree = workflow.tree(cli.board);
  cli.print(
    cli.hasFlag('--active') ? workflow.activeTree(boardTree) : boardTree,
  );
}

function setCommand(cli) {
  const operation = {
    op: 'set',
    id: cli.rest[0],
    color: notes.colorArg(cli.option('--color')),
  };
  if (cli.option('--text') !== undefined) {
    operation.text = cli.option('--text');
  }
  if (cli.option('--file') !== undefined) {
    operation.file = cli.option('--file');
  }
  console.log(store.writeOps(cli.board, [operation]));
}

function removeCommand(cli) {
  console.log(store.writeOps(cli.board, [{ op: 'remove', id: cli.rest[0] }]));
}

function layoutCommand(cli) {
  const direction = (
    cli.option('--dir') || geometry.defaultDir()
  ).toUpperCase();
  if (!store.SIDES[direction]) {
    console.error(`layout: --dir must be TB, LR, BT or RL, not ${direction}`);
    process.exit(1);
  }
  const operations = geometry.layoutOps(store.readBoard(cli.board), {
    ids: cli.list('--ids'),
    direction,
    isFitToText: cli.hasFlag('--fit'),
    dagre,
    flow: store.settings().foldDirection,
  });
  const moved = operations.filter((operation) => operation.op === 'set');
  console.log(store.writeOps(cli.board, operations), moved.length, 'cards');
}

function packCommand(cli) {
  const name = cli.option('--name');
  if (!name) {
    throw new Error('collapse needs --name');
  }
  const file = store.freePath(path.posix.dirname(cli.board), name, '.canvas');
  const { operations, subcanvas, id } = refactor.collapseOps(
    store.readBoard(cli.board),
    {
      ids: cli.list('--ids'),
      file,
      label: name,
    },
  );
  fileSystem.writeFileSync(store.vaultPath(file), store.serialize(subcanvas));
  store.writeOps(cli.board, operations);
  console.log(file, id);
}

// The subcanvas file goes to the trash unless --keep, or other cards and
// notes still link it.
function unpackCommand(cli) {
  const [id] = cli.rest;
  const card = store.readBoard(cli.board).nodes.find((node) => node.id === id);
  const subcanvas = card && notes.cardLinks(card).canvas;
  if (!subcanvas) {
    throw new Error('card links no canvas');
  }
  const isKept = cli.hasFlag('--keep');
  const others = isKept ? [] : notes.linksTo(subcanvas, cli.board, id);
  const operations = refactor.expandOps(store.readBoard(cli.board), {
    id,
    subcanvas: store.readBoard(subcanvas),
  });
  store.writeOps(cli.board, operations);
  if (isKept) {
    return console.log('unpacked (copy), kept', subcanvas);
  }
  if (others.length) {
    const linking = others.join(', ');
    console.log('unpacked, kept', subcanvas, '- still linked from:', linking);
    return;
  }
  store.toTrash(subcanvas);
  console.log('unpacked (dissolve), trashed', subcanvas);
}

function mergeCommand(cli) {
  const operations = refactor.mergeOps(
    store.readBoard(cli.board),
    cli.list('--ids'),
  );
  console.log(store.writeOps(cli.board, operations));
}

function splitCommand(cli) {
  const separator = cli.option('--by') || 'paragraph';
  const operations = refactor.splitOps(
    store.readBoard(cli.board),
    cli.rest[0],
    separator,
  );
  console.log(store.writeOps(cli.board, operations));
}

// The first argument is the archive note, not a board: the note says which
// board the card goes back to.
function restoreCommand(cli) {
  const note = cli.boardArg;
  const source = fileSystem.readFileSync(store.vaultPath(note), 'utf8');
  const target = notes.restoreOps({ nodes: [], edges: [] }, source).board;
  const { operations } = notes.restoreOps(store.readBoard(target), source);
  console.log(
    store.writeOps(target, operations),
    target,
    operations[0].node.id,
  );
  store.toTrash(note);
}

function rollupCommand(cli) {
  cli.print(workflow.rollup(cli.board));
}

// The user's workflow (Settings > Workflow, data.json): color roles,
// template paths and the values {placeholders} take in the agent instructions.
function workflowCommand(cli) {
  const resolved = workflow.workflowNow();
  cli.print({
    ...resolved,
    waiting: [...resolved.waiting],
    placeholders: config.placeholders(resolved),
  });
}

// The agent instructions with their {placeholders} filled in, as a pass reads
// them.
function instructionsCommand() {
  const file = path.join(store.PLUGIN_DIR, 'agent-instructions.md');
  const text = fileSystem.readFileSync(file, 'utf8');
  process.stdout.write(config.fillPlaceholders(text, workflow.workflowNow()));
}

// Command pattern: each canvas.js command name (and its alias) maps to the
// function that runs it.
const byName = {
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
  workflow: workflowCommand,
  instructions: instructionsCommand,
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
  workflowCommand,
  instructionsCommand,
  byName,
};
