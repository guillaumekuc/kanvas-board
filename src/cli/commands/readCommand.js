const readBoard = require('../../board/readBoard.js');

function readCommand(cli) {
  cli.print(readBoard(cli.board));
}

module.exports = readCommand;
