const path = require('path');

// <vault>/.obsidian/plugins/kanvas-board
const ROOT = path.resolve(__dirname, '..', '..', '..');
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

module.exports = {
  ROOT,
  DEFAULT_BOARD,
  SKIP_DIRS,
  COLORS,
  URGENCY,
  TEMPLATE_DIR,
  ARCHIVE_DIR,
  OBSIDIAN,
  SIDES,
};
