const findFile = require('./findFile.js');
const parseOrNull = require('./parseOrNull.js');
const path = require('path');
const readOrNull = require('./readOrNull.js');
const relinkText = require('./relinkText.js');
const vaultFileIndex = require('./vaultFileIndex.js');

const LINKABLE = /\.(md|canvas)$/;

// Cards (any .canvas) and notes (.md) that link `relativePath`, except card
// `skipId` on `board`: ['path (card id)' | 'path'].
function linksTo(relativePath, board, skipId) {
  const hits = (target) => findFile(target) === relativePath;
  const isLinking = (text) =>
    relinkText(text, hits, () => '\u0000') !== (text || '');
  const isLinkingCard = (node) =>
    node.type === 'file' ? node.file === relativePath : isLinking(node.text);
  const linksIn = (file, source) => {
    if (file.endsWith('.md')) return isLinking(source) ? [file] : [];
    const nodes = (parseOrNull(source) || {}).nodes || [];
    return nodes
      .filter((node) => !(file === board && node.id === skipId))
      .filter(isLinkingCard)
      .map((node) => `${file} (${node.id})`);
  };
  const name = path.posix.basename(relativePath);
  const found = [];
  for (const file of vaultFileIndex.paths()) {
    if (file === relativePath || !LINKABLE.test(file)) continue;
    const source = readOrNull(file);
    if (source && source.includes(name)) found.push(...linksIn(file, source));
  }
  return found;
}

module.exports = linksTo;
