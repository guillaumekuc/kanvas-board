import * as store from '../board/store.js';
import * as commands from './commands.js';

// `canvas.js <command> <board> [values] [--option value] [--flag]`: what the
// commands read from it.
function parseArguments(args) {
  function isValue(index) {
    return index > 0 && args[index - 1].startsWith('--');
  }
  const positional = args.filter(
    (argument, index) => !argument.startsWith('--') && !isValue(index),
  );
  const [commandName, boardArg, ...rest] = positional;
  function option(name) {
    const index = args.indexOf(name);

    return index >= 0 ? args[index + 1] : undefined;
  }
  const defaultBoard = String(store.settings().defaultBoard || '').trim();

  return {
    commandName,
    board: boardArg || defaultBoard || store.DEFAULT_BOARD,
    boardArg,
    rest,
    option,
    list: (name) => (option(name) || '').split(',').filter(Boolean),
    hasFlag: (name) => args.includes(name),
    print: (value) => console.log(JSON.stringify(value, null, 2)),
  };
}

// The canvas.js command line; usage in usage.txt (also the top of the built
// canvas.js).

const USAGE =
  'Usage: node .obsidian/plugins/kanvas-board/canvas.js ' +
  'read|tree|set|add|remove|edge|layout|pack|unpack|merge|split|extract|' +
  'archive|restore|rollup|check <board> ... (see header)';

const cli = parseArguments(process.argv.slice(2));
const name = cli.commandName || '';
const command = Object.hasOwn(commands.byName, name)
  ? commands.byName[name]
  : null;
if (!command) {
  console.error(USAGE);
  process.exit(1);
}
command(cli);
