const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..'); // <vault>/.obsidian/plugins/canvas-board
const DEFAULT_BOARD = 'Board.canvas';
const SKIP_DIRS = new Set(['.git', '.obsidian', '.trash', 'node_modules']); // plus data.json `skipFolders` (folder names), see findFile
const COLORS = { red: '1', orange: '2', yellow: '3', green: '4', cyan: '5', purple: '6' };
// --- Refactor operations ------------------------------------------------------------------------------
// Pure: they return ops (and the other file's content when there is one); the CLI and the plugin write them.

const URGENCY = ['1', '3', '2', '5', '6', '4']; // red > yellow > orange > cyan > purple > green > none
// --- Templates ----------------------------------------------------------------------------------------
// A template is a .canvas file (Templates/Canvas/). Its cards get new ids and land with their top-left at `at`.

const TEMPLATE_DIR = 'Templates/Canvas';
// --- Archive ------------------------------------------------------------------------------------------
// An archived card becomes a note (body = its text, or a link to its file) whose frontmatter keeps what a
// restore needs: board, id, place, size, color and its edges. Listed by Canvas archive.base.

const ARCHIVE_DIR = 'Board notes/Archive'; // the folder for all boards (setting "Archive": global)
// --- Obsidian CLI -----------------------------------------------------------------------------------

// On PATH first (the CLI registers it there), then the default install of each platform.
const OBSIDIAN = ['obsidian', 'C:\\Program Files\\Obsidian\\Obsidian.com', '/Applications/Obsidian.app/Contents/MacOS/Obsidian'];
// --- Layout -------------------------------------------------------------------------------------------

const SIDES = { TB: ['bottom', 'top'], LR: ['right', 'left'], BT: ['top', 'bottom'], RL: ['left', 'right'] }; // edge [from, to] per direction

module.exports = { ROOT, DEFAULT_BOARD, SKIP_DIRS, COLORS, URGENCY, TEMPLATE_DIR, ARCHIVE_DIR, OBSIDIAN, SIDES };
