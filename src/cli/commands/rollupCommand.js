const rollup = require('../../workflow/rollup.js');

function rollupCommand(cli) {
  cli.print(rollup(cli.board));
}

module.exports = rollupCommand;
