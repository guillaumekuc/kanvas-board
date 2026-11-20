import fileSystem from 'fs';
import path from 'path';
import { ApmCounter, loadSettings } from '../apm/apm.js';
import { applyOps, SIDES, TEMPLATE_DIR } from '../board/store.js';
import { archiveDir, archiveNote, restoreOps } from '../board/notes.js';
import { layoutOps } from '../board/geometry.js';
import {
  collapseOps,
  expandOps,
  extractOps,
  mergeOps,
  plainLines,
  relinkText,
  splitOps,
  templateOps,
} from '../board/refactor.js';
import { applyToOpenCanvas } from './unpack.js';

// [color name, canvas color, command key, default label]. Labels can be edited
// in Settings > Workflow.
const COLORS = [
  ['none', '', '0', 'Inbox'],
  ['red', '1', '1', 'Blocked'],
  ['orange', '2', '2', 'In Progress'],
  ['yellow', '3', '3', 'Review'],
  ['green', '4', '4', 'Done'],
  ['cyan', '5', '5', 'Do'],
  ['purple', '6', '6', 'Clarify'],
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
  // cards that start a pass (and that tree --active takes, see workflow.js);
  // empty = never
  passColors: 'cyan purple',
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
// Settings > Workflow: what each color does (as in the skill). Fixed: the label
// above is only how it reads.
const WORKFLOW = [
  ['cyan', 'The agent carries the card to done.'],
  ['purple', 'The agent takes one step, then hands back.'],
  ['orange', 'A pass is on the card.'],
  ['yellow', 'A question or a review for you.'],
  ['red', 'Nothing moves until it is unblocked.'],
  ['green', 'Finished. Remove the card when it no longer helps.'],
  ['none', 'No state. The agent never touches it.'],
];
// Tidy layout directions, in the order shift-click cycles them. `turn`: how far
// the button's icon rotates.
const LAYOUT_DIRS = {
  TB: { name: 'top to bottom', turn: 0 },
  LR: { name: 'left to right', turn: -90 },
  BT: { name: 'bottom to top', turn: 180 },
  RL: { name: 'right to left', turn: 90 },
};
const LINUX_TERMINALS = [
  // [binary, (vault, command) => args]
  [
    'gnome-terminal',
    (vault, command) => [`--working-directory=${vault}`, '--', ...command],
  ],
  ['konsole', (vault, command) => ['--workdir', vault, '-e', ...command]],
  [
    'xfce4-terminal',
    (vault, command) => ['--working-directory', vault, '-x', ...command],
  ],
  ['kitty', (vault, command) => ['--directory', vault, ...command]],
  [
    'alacritty',
    (vault, command) => ['--working-directory', vault, '-e', ...command],
  ],
  ['wezterm', (vault, command) => ['start', '--cwd', vault, '--', ...command]],
  ['foot', (vault, command) => [`--working-directory=${vault}`, ...command]],
  ['x-terminal-emulator', (vault, command) => ['-e', ...command]],
  ['xterm', (vault, command) => ['-e', ...command]],
];

// Facade: the board operations the plugin shares with the canvas.js CLI.
// The *Ops functions are pure: they return operations (and the other file's
// content when there is one); the CLI and the plugin write them.

const boardLibrary = {
  SIDES,
  TEMPLATE_DIR,
  applyOps,
  archiveDir,
  archiveNote,
  collapseOps,
  expandOps,
  extractOps,
  layoutOps,
  mergeOps,
  plainLines,
  relinkText,
  restoreOps,
  splitOps,
  templateOps,
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
      return canvas ? applyToOpenCanvas(canvas, operations) : null;
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
        file.extension === 'canvas' && file.path.startsWith(TEMPLATE_DIR + '/'),
    );
}

// The path under the template folder, subfolders kept, without .canvas.
function templateName(file) {
  return file.path.slice(TEMPLATE_DIR.length + 1, -'.canvas'.length);
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
  settings.apm = loadSettings(settings.apm, legacy);
  const apm = new ApmCounter(plugin, settings.apm, () =>
    plugin.saveData(settings),
  );
  apm.load();
  plugin.register(() => apm.unload());
  return apm;
}

export {
  COLORS,
  DEFAULTS,
  COLOR_NUM,
  WORKFLOW,
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
