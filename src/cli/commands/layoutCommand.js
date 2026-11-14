const { SIDES } = require('../../board/constants.js');
const dagre = require('../../../dagre.min.js');
const defaultDir = require('../../board/defaultDir.js');
const layoutOps = require('../../board/layoutOps.js');
const readBoard = require('../../board/readBoard.js');
const settings = require('../../board/settings.js');
const writeOps = require('../../board/writeOps.js');

function layoutCommand(cli) {
  const direction = (cli.option('--dir') || defaultDir()).toUpperCase();
  if (!SIDES[direction]) {
    console.error(`layout: --dir must be TB, LR, BT or RL, not ${direction}`);
    process.exit(1);
  }
  const operations = layoutOps(readBoard(cli.board), {
    ids: cli.list('--ids'),
    direction,
    isFitToText: cli.hasFlag('--fit'),
    dagre,
    flow: settings().foldDirection,
  });
  const moved = operations.filter((operation) => operation.op === 'set');
  console.log(writeOps(cli.board, operations), moved.length, 'cards');
}

module.exports = layoutCommand;
