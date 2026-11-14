const vaultPath = require('./vaultPath.js');
const api = require('./api.js');
const applyOps = require('./applyOps.js');
const fileSystem = require('fs');
const readFileBoard = require('./readFileBoard.js');
const serialize = require('./serialize.js');

function writeOps(board, operations) {
  const out = api('apply', board, operations);
  if (out === 'obsidian') return 'obsidian';
  if (out !== null && out !== 'closed') {
    throw new Error(`Obsidian edit failed: ${out}`);
  }
  const canvasData = readFileBoard(board);
  applyOps(canvasData, operations);
  fileSystem.writeFileSync(vaultPath(board), serialize(canvasData));
  return 'file';
}

module.exports = writeOps;
