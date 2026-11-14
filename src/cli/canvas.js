// The canvas.js command line; usage in usage.txt (also the top of the built
// canvas.js).
const { DEFAULT_BOARD } = require('../board/constants.js');
const COMMANDS = require('./commands/index.js');
const settings = require('../board/settings.js');

const USAGE =
  'Usage: node .obsidian/plugins/canvas-board/canvas.js ' +
  'read|tree|set|add|remove|edge|layout|pack|unpack|merge|split|extract|' +
  'archive|restore|rollup|check <board> ... (see header)';

const args = process.argv.slice(2);
const isValue = (index) => index > 0 && args[index - 1].startsWith('--');
const positional = args.filter(
  (argument, index) => !argument.startsWith('--') && !isValue(index),
);
const [commandName, boardArg, ...rest] = positional;
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const cli = {
  board:
    boardArg || String(settings().defaultBoard || '').trim() || DEFAULT_BOARD,
  boardArg,
  rest,
  option,
  list: (name) => (option(name) || '').split(',').filter(Boolean),
  hasFlag: (name) => args.includes(name),
  print: (value) => console.log(JSON.stringify(value, null, 2)),
};
const command = Object.hasOwn(COMMANDS, commandName || '')
  ? COMMANDS[commandName]
  : null;
if (!command) {
  console.error(USAGE);
  process.exit(1);
}
command(cli);
