const abs = require('./abs.js');
const findFile = require('./findFile.js');
const fs = require('fs');
const path = require('path');
const relinkText = require('./relinkText.js');
const vaultFileIndex = require('./vaultFileIndex.js');

// Cards (any .canvas) and notes (.md) that link `rel`, except card `skipId` on `board`: ['path (card id)' | 'path'].
function linksTo(rel, board, skipId) {
  const out = [];
  const hits = (t) => findFile(t) === rel;
  for (const f of vaultFileIndex.paths()) {
    if (f === rel || !/\.(md|canvas)$/.test(f)) continue;
    let src;
    try {
      src = fs.readFileSync(abs(f), 'utf8');
    } catch (e) {
      continue;
    }
    if (!src.includes(path.posix.basename(rel))) continue;
    if (f.endsWith('.md')) {
      if (relinkText(src, hits, () => '\u0000') !== src) out.push(f);
      continue;
    }
    let d;
    try {
      d = JSON.parse(src || '{}');
    } catch (e) {
      continue;
    }
    for (const n of d.nodes || []) {
if (
        !(f === board && n.id === skipId) &&
        (n.type === 'file'
          ? n.file === rel
          : relinkText(n.text, hits, () => '\u0000') !== (n.text || ''))
      ) {out.push(`${f} (${n.id})`);}
}
  }
  return out;
}

module.exports = linksTo;
