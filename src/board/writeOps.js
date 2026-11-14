const abs = require('./abs.js');
const api = require('./api.js');
const applyOps = require('./applyOps.js');
const fs = require('fs');
const readFileBoard = require('./readFileBoard.js');
const serialize = require('./serialize.js');

function writeOps(board, ops) {
  const out = api('apply', board, ops);
  if (out === 'obsidian') return 'obsidian';
  if (out !== null && out !== 'closed') throw new Error(`Obsidian edit failed: ${out}`);
  const d = readFileBoard(board);
  applyOps(d, ops);
  fs.writeFileSync(abs(board), serialize(d));
  return 'file';
}

module.exports = writeOps;
