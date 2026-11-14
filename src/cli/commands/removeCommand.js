const writeOps = require('../../board/writeOps.js');

function removeCommand(cli) {
  console.log(writeOps(cli.board, [{ op: 'remove', id: cli.rest[0] }]));
}

module.exports = removeCommand;
