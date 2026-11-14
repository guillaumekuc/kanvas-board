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

module.exports = {
  COLORS,
  DEFAULTS,
  COLOR_NUM,
  WORKFLOW,
  LAYOUT_DIRS,
  LINUX_TERMINALS,
};
