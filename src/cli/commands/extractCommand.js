const extractOps = require('../../board/extractOps.js');
const readBoard = require('../../board/readBoard.js');
const writeOps = require('../../board/writeOps.js');

function extractCommand(cli) {
  const operations = extractOps(readBoard(cli.board), {
    id: cli.rest[0],
    part: cli.option('--text') || '',
  });
  console.log(writeOps(cli.board, operations));
}

module.exports = extractCommand;
