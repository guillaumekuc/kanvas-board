const collapseOps = require('../../board/collapseOps.js');
const fileSystem = require('fs');
const freePath = require('../../board/freePath.js');
const path = require('path');
const readBoard = require('../../board/readBoard.js');
const serialize = require('../../board/serialize.js');
const vaultPath = require('../../board/vaultPath.js');
const writeOps = require('../../board/writeOps.js');

function packCommand(cli) {
  const name = cli.option('--name');
  if (!name) throw new Error('collapse needs --name');
  const file = freePath(path.posix.dirname(cli.board), name, '.canvas');
  const { operations, subcanvas, id } = collapseOps(readBoard(cli.board), {
    ids: cli.list('--ids'),
    file,
    label: name,
  });
  fileSystem.writeFileSync(vaultPath(file), serialize(subcanvas));
  writeOps(cli.board, operations);
  console.log(file, id);
}

module.exports = packCommand;
