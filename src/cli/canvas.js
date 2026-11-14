// The canvas.js command line; usage in usage.txt (also the top of the built
// canvas.js).
const COMMANDS = require('./commands/index.js');
const parseArguments = require('./parseArguments.js');

const USAGE =
  'Usage: node .obsidian/plugins/canvas-board/canvas.js ' +
  'read|tree|set|add|remove|edge|layout|pack|unpack|merge|split|extract|' +
  'archive|restore|rollup|check <board> ... (see header)';

const cli = parseArguments(process.argv.slice(2));
const name = cli.commandName || '';
const command = Object.hasOwn(COMMANDS, name) ? COMMANDS[name] : null;
if (!command) {
  console.error(USAGE);
  process.exit(1);
}
command(cli);
