const { DEFAULT_BOARD } = require('../board/constants.js');
const settings = require('../board/settings.js');

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
  const defaultBoard = String(settings().defaultBoard || '').trim();
  return {
    commandName,
    board: boardArg || defaultBoard || DEFAULT_BOARD,
    boardArg,
    rest,
    option,
    list: (name) => (option(name) || '').split(',').filter(Boolean),
    hasFlag: (name) => args.includes(name),
    print: (value) => console.log(JSON.stringify(value, null, 2)),
  };
}

module.exports = parseArguments;
