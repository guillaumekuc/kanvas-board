const colorArg = require('../../board/colorArg.js');
const writeOps = require('../../board/writeOps.js');

function setCommand(cli) {
  const operation = {
    op: 'set',
    id: cli.rest[0],
    color: colorArg(cli.option('--color')),
  };
  if (cli.option('--text') !== undefined) operation.text = cli.option('--text');
  if (cli.option('--file') !== undefined) operation.file = cli.option('--file');
  console.log(writeOps(cli.board, [operation]));
}

module.exports = setCommand;
