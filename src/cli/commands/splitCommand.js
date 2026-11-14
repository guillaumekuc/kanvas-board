const readBoard = require('../../board/readBoard.js');
const splitOps = require('../../board/splitOps.js');
const writeOps = require('../../board/writeOps.js');

function splitCommand(cli) {
  const separator = cli.option('--by') || 'paragraph';
  const operations = splitOps(readBoard(cli.board), cli.rest[0], separator);
  console.log(writeOps(cli.board, operations));
}

module.exports = splitCommand;
