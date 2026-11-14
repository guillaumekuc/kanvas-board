// [color name, canvas color, command key, default label]. Labels can be edited in Settings > Workflow.
const COLORS = [
  ['none', '', '0', 'Inbox'],
  ['red', '1', '1', 'Blocked'],
  ['orange', '2', '2', 'In Progress'],
  ['yellow', '3', '3', 'Review'],
  ['green', '4', '4', 'Done'],
  ['cyan', '5', '5', 'Do'],
  ['purple', '6', '6', 'Clarify'],
];
// Terminal command: empty = the platform's terminal (defaultLaunch); else {vault} {board} {claude} are replaced
// and quoted parts stay one argument.
const DEFAULTS = {
  defaultBoard: 'Board.canvas',
  claudePath: '',
  layoutDirection: 'TB', // TB, LR, BT or RL
  colorLabels: {}, // color name → label, when edited (Settings > Workflow)
  cardWarning: '60',
  staleDays: '7', // yellow cards whose note is untouched this long get a warning badge (and the rollup's `· Nd`)
  hideTagBranches: true, // a hidden tag also hides the cards below its cards (in the fold direction)
  foldDirection: 'out', // fold hides the cards a card points to (out) or the cards pointing to it (in)
  terminal: '',
  passColors: 'cyan purple', // cards that start a pass (and that tree --active takes, see workflow.js); empty = never
  notesFolder: 'Board notes', // where the agent keeps the notes it makes for cards (read by workflow.js and the skill)
  archiveMode: 'board', // board: archive notes in "<board> archive/" next to each board; global: all in archiveFolder
  archiveFolder: 'Board notes/Archive', // the one archive folder when archiveMode is global
};
const COLOR_NUM = {
  red: '1',
  orange: '2',
  yellow: '3',
  green: '4',
  cyan: '5',
  purple: '6',
};
// Settings > Workflow: what each color does (as in the skill). Fixed: the label above is only how it reads.
const WORKFLOW = [
  ['cyan', 'The agent carries the card to done.'],
  ['purple', 'The agent takes one step, then hands back.'],
  ['orange', 'A pass is on the card.'],
  ['yellow', 'A question or a review for you.'],
  ['red', 'Nothing moves until it is unblocked.'],
  ['green', 'Finished. Remove the card when it no longer helps.'],
  ['none', 'No state. The agent never touches it.'],
];
// Tidy layout directions, in the order shift-click cycles them. `turn`: how far the button's icon rotates.
const LAYOUT_DIRS = {
  TB: { name: 'top to bottom', turn: 0 },
  LR: { name: 'left to right', turn: -90 },
  BT: { name: 'bottom to top', turn: 180 },
  RL: { name: 'right to left', turn: 90 },
};
const LINUX_TERMINALS = [
  // [binary, (vault, command) => args]
  ['gnome-terminal', (v, c) => [`--working-directory=${v}`, '--', ...c]],
  ['konsole', (v, c) => ['--workdir', v, '-e', ...c]],
  ['xfce4-terminal', (v, c) => ['--working-directory', v, '-x', ...c]],
  ['kitty', (v, c) => ['--directory', v, ...c]],
  ['alacritty', (v, c) => ['--working-directory', v, '-e', ...c]],
  ['wezterm', (v, c) => ['start', '--cwd', v, '--', ...c]],
  ['foot', (v, c) => [`--working-directory=${v}`, ...c]],
  ['x-terminal-emulator', (v, c) => ['-e', ...c]],
  ['xterm', (v, c) => ['-e', ...c]],
];

module.exports = {
  COLORS,
  DEFAULTS,
  COLOR_NUM,
  WORKFLOW,
  LAYOUT_DIRS,
  LINUX_TERMINALS,
};
