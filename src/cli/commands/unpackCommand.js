const cardLinks = require('../../board/cardLinks.js');
const expandOps = require('../../board/expandOps.js');
const linksTo = require('../../board/linksTo.js');
const readBoard = require('../../board/readBoard.js');
const toTrash = require('../../board/toTrash.js');
const writeOps = require('../../board/writeOps.js');

// The subcanvas file goes to the trash unless --keep, or other cards and
// notes still link it.
function unpackCommand(cli) {
  const [id] = cli.rest;
  const card = readBoard(cli.board).nodes.find((node) => node.id === id);
  const subcanvas = card && cardLinks(card).canvas;
  if (!subcanvas) throw new Error('card links no canvas');
  const isKept = cli.hasFlag('--keep');
  const others = isKept ? [] : linksTo(subcanvas, cli.board, id);
  const operations = expandOps(readBoard(cli.board), {
    id,
    subcanvas: readBoard(subcanvas),
  });
  writeOps(cli.board, operations);
  if (isKept) return console.log('unpacked (copy), kept', subcanvas);
  if (others.length) {
    const linking = others.join(', ');
    console.log('unpacked, kept', subcanvas, '- still linked from:', linking);
    return;
  }
  toTrash(subcanvas);
  console.log('unpacked (dissolve), trashed', subcanvas);
}

module.exports = unpackCommand;
