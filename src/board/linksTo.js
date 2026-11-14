const vaultPath = require('./vaultPath.js');
const findFile = require('./findFile.js');
const fileSystem = require('fs');
const path = require('path');
const relinkText = require('./relinkText.js');
const vaultFileIndex = require('./vaultFileIndex.js');

// Cards (any .canvas) and notes (.md) that link `rel`, except card `skipId` on `board`: ['path (card id)' | 'path'].
function linksTo(relativePath, board, skipId) {
  const out = [];
  const hits = (target) => findFile(target) === relativePath;
  for (const file of vaultFileIndex.paths()) {
    if (file === relativePath || !/\.(md|canvas)$/.test(file)) continue;
    let source;
    try {
      source = fileSystem.readFileSync(vaultPath(file), 'utf8');
    } catch (error) {
      continue;
    }
    if (!source.includes(path.posix.basename(relativePath))) continue;
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
          ? node.file === relativePath
          : relinkText(node.text, hits, () => '\u0000') !== (node.text || ''))
      ) {
        out.push(`${file} (${node.id})`);
      }
    }
  }
  return out;
}

module.exports = linksTo;
