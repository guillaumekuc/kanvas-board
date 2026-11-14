const colorArg = require('../../board/colorArg.js');
const fitHeight = require('../../board/fitHeight.js');
const newId = require('../../board/newId.js');
const place = require('../../board/place.js');
const readBoard = require('../../board/readBoard.js');
const writeOps = require('../../board/writeOps.js');

const DEFAULT_WIDTH = 320;

function addCommand(cli) {
  const text = cli.option('--text') || '';
  const width = Number(cli.option('--width') || DEFAULT_WIDTH);
  const height = Number(
    cli.option('--height') || fitHeight(cli.option('--text'), width),
  );
  const near = cli.option('--near');
  const { x, y } = place(readBoard(cli.board), { near, width, height });
  const node = { id: newId(), type: 'text', text, x, y, width, height };
  const color = colorArg(cli.option('--color'));
  if (color) node.color = color;
  writeOps(cli.board, [{ op: 'add', node }]);
  console.log(node.id);
}

module.exports = addCommand;
