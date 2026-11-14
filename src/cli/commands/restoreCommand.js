const fileSystem = require('fs');
const readBoard = require('../../board/readBoard.js');
const restoreOps = require('../../board/restoreOps.js');
const toTrash = require('../../board/toTrash.js');
const vaultPath = require('../../board/vaultPath.js');
const writeOps = require('../../board/writeOps.js');

// The first argument is the archive note, not a board: the note says which
// board the card goes back to.
function restoreCommand(cli) {
  const note = cli.boardArg;
  const source = fileSystem.readFileSync(vaultPath(note), 'utf8');
  const target = restoreOps({ nodes: [], edges: [] }, source).board;
  const { operations } = restoreOps(readBoard(target), source);
  console.log(writeOps(target, operations), target, operations[0].node.id);
  toTrash(note);
}

module.exports = restoreCommand;
