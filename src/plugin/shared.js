import fileSystem from 'fs';
import path from 'path';
import * as apm from '../apm/apm.js';
import * as store from '../board/store.js';
import * as notes from '../board/notes.js';
import * as geometry from '../board/geometry.js';
import * as refactor from '../board/refactor.js';
import * as unpack from './unpack.js';
import * as config from '../workflow/config.js';

// canvasColor: the canvas color number; commandKey: the color-<key> command
// id. A color's label is its role's (config.ROLES), editable in Settings >
// Workflow.
const COLORS = [
  { name: 'none', canvasColor: '', commandKey: '0' },
  { name: 'red', canvasColor: '1', commandKey: '1' },
  { name: 'orange', canvasColor: '2', commandKey: '2' },
  { name: 'yellow', canvasColor: '3', commandKey: '3' },
  { name: 'green', canvasColor: '4', commandKey: '4' },
  { name: 'cyan', canvasColor: '5', commandKey: '5' },
  { name: 'purple', canvasColor: '6', commandKey: '6' },
];
// Terminal command: empty = the platform's terminal (defaultLaunch); else
// {vault} {board} are replaced, a {agent} word becomes the agent command with
// its prompt, and quoted parts stay one argument.
const DEFAULTS = {
  defaultBoard: 'Board.canvas',
  // empty: Claude Code; else the agent's command, {prompt} where the prompt
  // goes (else last)
  agentCommand: '',
  layoutDirection: 'TB', // TB, LR, BT or RL
  colorLabels: {}, // color name → label, when edited (Settings > Workflow)
  cardWarning: '60',
  // yellow cards whose note is untouched this long get a warning badge (and the
  // rollup's `· Nd`)
  staleDays: '7',
  // a hidden tag also hides the cards below its cards (in the fold direction)
  hideTagBranches: true,
  // fold hides the cards a card points to (out) or the cards pointing to it
  // (in)
  foldDirection: 'out',
  terminal: '',
  // where the agent keeps the notes it makes for cards (read by workflow.js and
  // the skill)
  notesFolder: 'Board notes',
  // board: archive notes in "<board> archive/" next to each board; global: all
  // in archiveFolder
  archiveMode: 'board',
  // the one archive folder when archiveMode is global
  archiveFolder: 'Board notes/Archive',
};
const COLOR_NUM = {
  red: '1',
  orange: '2',
  yellow: '3',
  green: '4',
  cyan: '5',
  purple: '6',
};
// Settings > Workflow and the starter legend: one row per role, in the
// roles' order; uncolored last. `name`: the slot's color name (fixed),
// `theme`: the color the user has it show.
function workflowRows(settings) {
  const { colors } = config.resolve(settings);
  const rows = config.ROLES.map(({ role, color, meaning }) => ({
    role,
    name: color,
    theme: colors[role],
    meaning,
  }));

  return [
    ...rows,
    { role: null, name: 'none', theme: '', meaning: config.INBOX.meaning },
  ];
}
// Tidy layout directions, in the order shift-click cycles them. `turn`: how far
// the button's icon rotates.
const LAYOUT_DIRS = {
  TB: { name: 'top to bottom', turn: 0 },
  LR: { name: 'left to right', turn: -90 },
  BT: { name: 'bottom to top', turn: 180 },
  RL: { name: 'right to left', turn: 90 },
};
const LINUX_TERMINALS = [
  // args: (vault, command) => the terminal's arguments
  {
    binary: 'gnome-terminal',
    args: (vault, command) => [
      `--working-directory=${vault}`,
      '--',
      ...command,
    ],
  },
  {
    binary: 'konsole',
    args: (vault, command) => ['--workdir', vault, '-e', ...command],
  },
  {
    binary: 'xfce4-terminal',
    args: (vault, command) => ['--working-directory', vault, '-x', ...command],
  },
  {
    binary: 'kitty',
    args: (vault, command) => ['--directory', vault, ...command],
  },
  {
    binary: 'alacritty',
    args: (vault, command) => ['--working-directory', vault, '-e', ...command],
  },
  {
    binary: 'wezterm',
    args: (vault, command) => ['start', '--cwd', vault, '--', ...command],
  },
  {
    binary: 'foot',
    args: (vault, command) => [`--working-directory=${vault}`, ...command],
  },
  {
    binary: 'x-terminal-emulator',
    args: (vault, command) => ['-e', ...command],
  },
  { binary: 'xterm', args: (vault, command) => ['-e', ...command] },
];

// Facade: the board operations the plugin shares with the canvas.js CLI.
// The *Ops functions are pure: they return operations (and the other file's
// content when there is one); the CLI and the plugin write them.

const boardLibrary = {
  SIDES: store.SIDES,
  TEMPLATE_DIR: store.TEMPLATE_DIR,
  applyOps: store.applyOps,
  archiveDir: notes.archiveDir,
  archiveNote: notes.archiveNote,
  collapseOps: refactor.collapseOps,
  expandOps: refactor.expandOps,
  extractOps: refactor.extractOps,
  layoutOps: geometry.layoutOps,
  mergeOps: refactor.mergeOps,
  plainLines: refactor.plainLines,
  relinkText: refactor.relinkText,
  restoreOps: notes.restoreOps,
  splitOps: refactor.splitOps,
  templateOps: refactor.templateOps,
};

// What canvas.js calls through `obsidian eval` while a board is open, so
// Obsidian never saves its in-memory copy over an agent's edit. null: the
// board is not open, canvas.js edits the file itself.
function createApi(plugin) {
  return {
    read: (board) => {
      const canvas = plugin.openCanvas(board);

      return canvas ? JSON.stringify(canvas.getData()) : null;
    },
    apply: async (board, operations) => {
      const canvas = plugin.openCanvas(board);

      return canvas ? unpack.applyToOpenCanvas(canvas, operations) : null;
    },
  };
}

// An archive note (made by Archive) keeps where its card came from.
function isArchiveNote(app, file) {
  if (!file || file.extension !== 'md') {
    return false;
  }

  const { frontmatter } = app.metadataCache.getFileCache(file) || {};

  return Boolean(frontmatter && frontmatter['archived-from']);
}

function templateFiles(plugin) {
  return plugin.app.vault
    .getFiles()
    .filter(
      (file) =>
        file.extension === 'canvas' &&
        file.path.startsWith(store.TEMPLATE_DIR + '/'),
    );
}

// The path under the template folder, subfolders kept, without .canvas.
function templateName(file) {
  return file.path.slice(store.TEMPLATE_DIR.length + 1, -'.canvas'.length);
}

// The APM counter was once its own plugin: its settings, if it was installed.
function legacyApmSettings(pluginDir) {
  const file = path.join(pluginDir, '..', 'apm-counter', 'data.json');
  try {
    return JSON.parse(fileSystem.readFileSync(file, 'utf8'));
  } catch {
    return undefined;
  }
}

function startApmCounter(plugin, pluginDir) {
  const { settings } = plugin;
  const legacy = settings.apm ? undefined : legacyApmSettings(pluginDir);
  settings.apm = apm.loadSettings(settings.apm, legacy);
  const counter = new apm.ApmCounter(plugin, settings.apm, () =>
    plugin.saveData(settings),
  );
  counter.load();
  plugin.register(() => counter.unload());

  return counter;
}

export {
  COLORS,
  DEFAULTS,
  COLOR_NUM,
  workflowRows,
  LAYOUT_DIRS,
  LINUX_TERMINALS,
  boardLibrary,
  createApi,
  isArchiveNote,
  templateFiles,
  templateName,
  legacyApmSettings,
  startApmCounter,
};
