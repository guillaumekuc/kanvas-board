const abs = require('./abs.js');
const findFile = require('./findFile.js');
const fileSystem = require('fs');
const path = require('path');
const relinkText = require('./relinkText.js');
const vaultFileIndex = require('./vaultFileIndex.js');

// Cards (any .canvas) and notes (.md) that link `rel`, except card `skipId` on `board`: ['path (card id)' | 'path'].
function linksTo(rel, board, skipId) {
  const out = [];
  const hits = (target) => findFile(target) === rel;
  for (const file of vaultFileIndex.paths()) {
    if (file === rel || !/\.(md|canvas)$/.test(file)) continue;
    let source;
    try {
      source = fileSystem.readFileSync(abs(file), 'utf8');
    } catch (error) {
      continue;
    }
    if (!source.includes(path.posix.basename(rel))) continue;
    if (file.endsWith('.md')) {
      if (relinkText(source, hits, () => '\u0000') !== source) out.push(file);
      continue;
    }
    let canvasData;
    try {
      canvasData = JSON.parse(source || '{}');
    } catch (error) {
      continue;
    }
    for (const node of canvasData.nodes || []) {
      if (
        !(file === board && node.id === skipId) &&
        (node.type === 'file'
          ? node.file === rel
          : relinkText(node.text, hits, () => '\u0000') !== (node.text || ''))
      ) {
        out.push(`${file} (${node.id})`);
      }
    }
  }
  return out;
}

module.exports = linksTo;
