const archiveDir = require('../../board/archiveDir.js');
const archiveNote = require('../../board/archiveNote.js');
const cardContexts = require('../../board/cardContexts.js');
const fileSystem = require('fs');
const freePath = require('../../board/freePath.js');
const readBoard = require('../../board/readBoard.js');
const settings = require('../../board/settings.js');
const today = require('../../board/today.js');
const vaultPath = require('../../board/vaultPath.js');
const writeOps = require('../../board/writeOps.js');

function archiveCommand(cli) {
  const { board } = cli;
  const canvasData = readBoard(board);
  const ids = cli.rest[0].split(',');
  for (const id of ids) {
    const node = canvasData.nodes.find((each) => each.id === id);
    const contexts =
      (node && cardContexts(node)) || settings().archiveContexts;
    const date = today();
    const archived = archiveNote(canvasData, { id, board, date, contexts });
    const folder = archiveDir(board, settings());
    const file = freePath(folder, archived.name, '.md');
    fileSystem.mkdirSync(vaultPath(folder), { recursive: true });
    fileSystem.writeFileSync(vaultPath(file), archived.content);
    console.log(file);
  }
  writeOps(
    board,
    ids.map((id) => ({ op: 'remove', id })),
  );
}

module.exports = archiveCommand;
