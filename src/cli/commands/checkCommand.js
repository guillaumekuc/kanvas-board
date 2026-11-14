const check = require('../../workflow/check.js');

function checkCommand(cli) {
  const ids = cli.option('--ids') ? new Set(cli.list('--ids')) : undefined;
  cli.print(check(cli.board, ids));
}

module.exports = checkCommand;
