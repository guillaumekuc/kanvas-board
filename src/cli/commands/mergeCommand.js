const mergeOps = require('../../board/mergeOps.js');
const readBoard = require('../../board/readBoard.js');
const writeOps = require('../../board/writeOps.js');

function mergeCommand(cli) {
  const operations = mergeOps(readBoard(cli.board), cli.list('--ids'));
  console.log(writeOps(cli.board, operations));
}

module.exports = mergeCommand;
