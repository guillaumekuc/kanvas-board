const { ORANGE_STALE_MS, WORKING } = require('./constants.js');
const abs = require('../board/abs.js');
const cardLinks = require('../board/cardLinks.js');
const cardTextOk = require('./cardTextOk.js');
const findFile = require('../board/findFile.js');
const fs = require('fs');
const noteContexts = require('../board/noteContexts.js');
const notesFolder = require('./notesFolder.js');
const readBoard = require('../board/readBoard.js');

// ids: the cards a pass worked on. The check constrains what agents write, not what User does with the cards afterwards
// (merged cards, headings), so a pass passes its inventory plus the cards it added. Interrupted passes (stale orange)
// are always reported. Without ids: every colored card, as an audit.
function check(board, ids) {
  const issues = [];
  const walk = (b, depth, seen) => {
    seen.add(b);
    const d = readBoard(b);
    for (const n of d.nodes) {
      if (n.type === 'group' || !n.color) continue;
      const add = (issue) =>
        issues.push({
          board: b,
          id: n.id,
          text: (n.text || n.file || '').split('\n')[0],
          issue,
        });
      const scoped = !ids || ids.has(n.id);
      const links =
        n.type === 'file'
          ? [n.file]
          : [
              ...(n.text || '').matchAll(/\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g),
            ].map((m) => m[1].trim());
      if (scoped) {for (const l of links) if (!findFile(l)) add(`broken link [[${l}]]`);}
      if (
        scoped &&
        n.type === 'text' &&
        depth === 0 &&
        !cardTextOk(n.text || '')
      ) {
add(
          'card text is neither a wish (≤ 3 lines), `[[Note]] · reason` nor `<recap> · done · [[Output]]`',
        );
} // plan-canvas cards are parts, free text
      const { note, canvas } = cardLinks(n);
      if (note && note.startsWith(folder)) {
        const src = fs.readFileSync(abs(note), 'utf8');
        if (scoped) {
          const fm = (src.match(/^---\n([\s\S]*?)\n---/) || [])[1];
          const keys = fm
            ? [...fm.matchAll(/^(\w[\w-]*):/gm)].map((m) => m[1])
            : [];
          if (keys.join() !== 'context') {
add(
              `note frontmatter is not \`context\` only (${keys.join(', ') || 'none'})`,
            );
}
          if (noteContexts(fm).length !== 1) {add('note does not have exactly one context');}
          for (const s of ['Aim', 'Design']) {
if (!new RegExp(`^## ${s}\\s*$`, 'm').test(src)) {add(`note has no ## ${s}`);}
}
          if (!/^### Done when\s*$/m.test(src)) {add('note has no ### Done when (under Aim)');}
          if (n.color === '4' && !/^## Output\s*$/m.test(src)) {add('green card, note has no ## Output');}
        }
        if (
          n.color === WORKING &&
          Date.now() - fs.statSync(abs(note)).mtimeMs > ORANGE_STALE_MS
        ) {add('orange card, note untouched for 1h+ (interrupted pass?)');}
      }
      if (canvas && !seen.has(canvas) && depth < 2) {walk(canvas, depth + 1, seen);}
    }
  };
  const folder = notesFolder();
  walk(board, 0, new Set());
  return { issues };
}

module.exports = check;
