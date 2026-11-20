import * as childProcess from 'child_process';
import path from 'path';
import fileSystem from 'fs';
import * as url from 'url';

const MARKDOWN_FILE = /\.md$/;
const EVAL_RESULT = /=>\s?([\s\S]*)$/;

// The plugin folder: __dirname of the built bundles (main.js and canvas.js
// are CommonJS). Unbundled (tests import src/ directly) it is the repo root.
const PLUGIN_DIR =
  typeof __dirname === 'string'
    ? __dirname
    : path.resolve(url.fileURLToPath(import.meta.url), '..', '..', '..');
// <vault>/.obsidian/plugins/kanvas-board
const ROOT = path.resolve(PLUGIN_DIR, '..', '..', '..');
const DEFAULT_BOARD = 'Board.canvas';
// plus data.json `skipFolders` (folder names), see findFile
const SKIP_DIRS = new Set(['.git', '.obsidian', '.trash', 'node_modules']);
const COLORS = {
  red: '1',
  orange: '2',
  yellow: '3',
  green: '4',
  cyan: '5',
  purple: '6',
};

// red > yellow > orange > cyan > purple > green > none
const URGENCY = ['1', '3', '2', '5', '6', '4'];

const TEMPLATE_DIR = 'Templates/Canvas';

// the folder for all boards (setting "Archive": global)
const ARCHIVE_DIR = 'Board notes/Archive';

// On PATH first (the CLI registers it there), then the default install of each
// platform.
const OBSIDIAN = [
  'obsidian',
  'C:\\Program Files\\Obsidian\\Obsidian.com',
  '/Applications/Obsidian.app/Contents/MacOS/Obsidian',
];

const SIDES = {
  TB: ['bottom', 'top'],
  LR: ['right', 'left'],
  BT: ['top', 'bottom'],
  RL: ['left', 'right'],
}; // edge [from, to] per direction

function mostUrgent(colors) {
  return URGENCY.find((color) => colors.includes(color)) || '';
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

function vaultPath(relativePath) {
  return path.join(ROOT, relativePath);
}

// Singleton: one walk of the vault per process, shared by every lookup. A
// file is found by its path, its path without .md, or its name.
class VaultFileIndex {
  constructor() {
    this.files = null;
  }

  get(name) {
    return this.load().get(name) || null;
  }

  paths() {
    return new Set(this.load().values());
  }

  load() {
    if (!this.files) {
      this.files = new Map();
      this.skipped = new Set([...SKIP_DIRS, ...(settings().skipFolders || [])]);
      this.walk('');
    }

    return this.files;
  }

  walk(folder) {
    const entries = fileSystem.readdirSync(vaultPath(folder), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      const relativePath = path.posix.join(folder, entry.name);
      if (!entry.isDirectory()) {
        this.add(relativePath, entry.name);
      } else if (!this.skipped.has(entry.name)) {
        this.walk(relativePath);
      }
    }
  }

  // The first file found keeps a name shared by several.
  add(relativePath, name) {
    const key = name.endsWith('.md') ? name.slice(0, -3) : name;
    if (!this.files.has(key)) {
      this.files.set(key, relativePath);
    }
    this.files.set(relativePath, relativePath);
    this.files.set(relativePath.replace(MARKDOWN_FILE, ''), relativePath);
  }
}

const vaultFileIndex = new VaultFileIndex();

function findFile(name) {
  return vaultFileIndex.get(name);
}

// A file that vanished or cannot be read counts as absent.
function readOrNull(relativePath) {
  try {
    return fileSystem.readFileSync(vaultPath(relativePath), 'utf8');
  } catch {
    return null;
  }
}

// A .canvas file that is not valid JSON (being written, broken) is skipped.
function parseOrNull(json) {
  try {
    return JSON.parse(json || '{}');
  } catch {
    return null;
  }
}

function readFileBoard(board) {
  const canvasData = JSON.parse(
    fileSystem.readFileSync(vaultPath(board), 'utf8') || '{}',
  );
  canvasData.nodes ||= [];
  canvasData.edges ||= [];

  return canvasData;
}

const NOT_INSTALLED = 'ENOENT';

// Tries one install path of the CLI: NOT_INSTALLED when it is not there.
function tryEval(binary, code) {
  try {
    const out = childProcess.execFileSync(binary, ['eval', `code=${code}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const match = out.match(EVAL_RESULT);
    if (!match) {
      throw new Error(out.trim());
    }
    return match[1].trim();
  } catch (error) {
    return error.code === 'ENOENT' ? NOT_INSTALLED : null;
  }
}

tryEval.NOT_INSTALLED = NOT_INSTALLED;

// Runs `code` in the running Obsidian through its CLI; null when Obsidian is
// not running or the CLI is off.
function obsidianEval(code) {
  for (const binary of OBSIDIAN) {
    const result = tryEval(binary, code);
    if (result !== NOT_INSTALLED) {
      return result;
    }
  }

  return null;
}

const PLUGIN = "app.plugins.plugins['kanvas-board']";

// Calls the plugin API inside Obsidian. 'closed' = board not open there;
// null = Obsidian not reachable.
function api(method, ...values) {
  const json = values.map((value) => JSON.stringify(value)).join(',');
  const call = `p.api.${method}(${json})`;

  return obsidianEval(
    `(async()=>{const p=${PLUGIN};if(!p||!p.api)return 'no plugin';` +
      `const r=await ${call};return r===null?'closed':r})()`,
  );
}

function readBoard(board) {
  const out = api('read', board);
  if (out && out.startsWith('{')) {
    const canvasData = JSON.parse(out);
    return { nodes: canvasData.nodes || [], edges: canvasData.edges || [] };
  }

  return readFileBoard(board);
}

// One card or edge per line, as Obsidian writes canvas files, so diffs stay
// readable.
function serialize(canvasData) {
  function lines(items) {
    return items.map((item) => '\t\t' + JSON.stringify(item)).join(',\n');
  }

  return (
    `{\n\t"nodes":[\n${lines(canvasData.nodes)}\n\t],\n` +
    `\t"edges":[\n${lines(canvasData.edges)}\n\t]\n}\n`
  );
}

// The card goes with every edge that touches it.
function removeNode(canvasData, operation) {
  canvasData.nodes = canvasData.nodes.filter(
    (node) => node.id !== operation.id,
  );
  canvasData.edges = canvasData.edges.filter(
    (edge) => edge.fromNode !== operation.id && edge.toNode !== operation.id,
  );
}

const OTHER_TYPE = { file: 'text', text: 'file' };

// Makes the card a `type` card holding `value`; true when its type changed.
function retype(node, type, value) {
  const isRetyped = node.type !== type;
  node.type = type;
  node[type] = value;
  delete node[OTHER_TYPE[type]];

  return isRetyped;
}

// An empty color means uncolored, which a canvas stores as no color field.
function setColor(node, color) {
  if (color) {
    node.color = color;
  } else {
    delete node.color;
  }
}

const GEOMETRY = ['x', 'y', 'width', 'height'];

// Returns the card's id when its type changed (text <-> file).
function setNode(canvasData, operation) {
  const node = canvasData.nodes.find((node) => node.id === operation.id);
  if (!node) {
    throw new Error('no node ' + operation.id);
  }
  if (operation.color !== undefined) {
    setColor(node, operation.color);
  }
  const retyped = [];
  if (operation.file !== undefined && retype(node, 'file', operation.file)) {
    retyped.push(node.id);
  }
  if (operation.text !== undefined && retype(node, 'text', operation.text)) {
    retyped.push(node.id);
  }
  for (const field of GEOMETRY) {
    if (operation[field] !== undefined) {
      node[field] = operation[field];
    }
  }

  return retyped;
}

// A missing edge is skipped: the user may have deleted it meanwhile.
function updateEdge(canvasData, operation, fields) {
  const edge = canvasData.edges.find((edge) => edge.id === operation.id);
  if (!edge) {
    return;
  }
  for (const field of fields) {
    edge[field] = operation[field];
  }
}

// Command pattern: each operation name maps to the function that applies it.

const handlers = {
  set: setNode,
  add: (canvasData, operation) => {
    canvasData.nodes.push(operation.node);
  },
  remove: removeNode,
  edge: (canvasData, operation) => {
    canvasData.edges.push(operation.edge);
  },
  unedge: (canvasData, operation) => {
    canvasData.edges = canvasData.edges.filter(
      (edge) => edge.id !== operation.id,
    );
  },
  sides: (canvasData, operation) =>
    updateEdge(canvasData, operation, ['fromSide', 'toSide']),
  retarget: (canvasData, operation) =>
    updateEdge(canvasData, operation, ['fromNode', 'toNode']),
  ends: (canvasData, operation) =>
    updateEdge(canvasData, operation, ['fromEnd', 'toEnd']),
};

const OPERATION_HANDLERS = handlers;

// Shared by both modes: runs in Node on the parsed file, or inside Obsidian
// (plugin) on canvas.getData(). Returns the ids of cards whose type changed.
function applyOps(canvasData, operations) {
  const retyped = [];
  for (const operation of operations) {
    const handler = OPERATION_HANDLERS[operation.op];
    const retypedIds = handler ? handler(canvasData, operation) : null;
    if (retypedIds) {
      retyped.push(...retypedIds);
    }
  }

  return retyped;
}

function writeOps(board, operations) {
  const out = api('apply', board, operations);
  if (out === 'obsidian') {
    return 'obsidian';
  }
  if (out !== null && out !== 'closed') {
    throw new Error(`Obsidian edit failed: ${out}`);
  }
  const canvasData = readFileBoard(board);
  applyOps(canvasData, operations);
  fileSystem.writeFileSync(vaultPath(board), serialize(canvasData));

  return 'file';
}

function toTrash(relativePath) {
  const destination = vaultPath(
    path.posix.join('.trash', path.posix.basename(relativePath)),
  );
  fileSystem.mkdirSync(path.dirname(destination), { recursive: true });
  fileSystem.renameSync(vaultPath(relativePath), destination);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function newId() {
  return [...Array(16)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join('');
}

// Next free `<dir>/<name><ext>` (vault-relative), adding " 2", " 3"... when
// taken.
function freePath(folder, name, extension) {
  for (let attempt = 1; ; attempt++) {
    const candidate = path.posix.join(
      folder,
      `${name}${attempt > 1 ? ' ' + attempt : ''}${extension}`,
    );
    if (!fileSystem.existsSync(vaultPath(candidate))) {
      return candidate;
    }
  }
}

export {
  ROOT,
  PLUGIN_DIR,
  DEFAULT_BOARD,
  SKIP_DIRS,
  COLORS,
  URGENCY,
  TEMPLATE_DIR,
  ARCHIVE_DIR,
  OBSIDIAN,
  SIDES,
  mostUrgent,
  settings,
  vaultPath,
  vaultFileIndex,
  findFile,
  readOrNull,
  parseOrNull,
  readFileBoard,
  tryEval,
  obsidianEval,
  api,
  readBoard,
  serialize,
  removeNode,
  retype,
  setColor,
  setNode,
  updateEdge,
  handlers,
  applyOps,
  writeOps,
  toTrash,
  today,
  newId,
  freePath,
};
