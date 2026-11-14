const { ORANGE_STALE_MS, WORKING } = require('./constants.js');
const vaultPath = require('../board/vaultPath.js');
const cardLinks = require('../board/cardLinks.js');
const cardTextOk = require('./cardTextOk.js');
const findFile = require('../board/findFile.js');
const fileSystem = require('fs');
const noteContexts = require('../board/noteContexts.js');
const notesFolder = require('./notesFolder.js');
const readBoard = require('../board/readBoard.js');

// ids: the cards a pass worked on. The check constrains what agents write, not what User does with the cards afterwards
// (merged cards, headings), so a pass passes its inventory plus the cards it added. Interrupted passes (stale orange)
// are always reported. Without ids: every colored card, as an audit.
function check(board, ids) {
  const issues = [];
  const walk = (board, depth, seen) => {
    seen.add(board);
    const canvasData = readBoard(board);
    for (const node of canvasData.nodes) {
      if (node.type === 'group' || !node.color) continue;
      const add = (issue) =>
        issues.push({
          board: board,
          id: node.id,
          text: (node.text || node.file || '').split('\n')[0],
          issue,
        });
      const scoped = !ids || ids.has(node.id);
      const links =
        node.type === 'file'
          ? [node.file]
          : [
              ...(node.text || '').matchAll(
                /\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g,
              ),
            ].map((match) => match[1].trim());
      if (scoped) {
        for (const link of links) {
          if (!findFile(link)) add(`broken link [[${link}]]`);
        }
      }
      if (
        scoped &&
        node.type === 'text' &&
        depth === 0 &&
        !cardTextOk(node.text || '')
      ) {
        add(
          'card text is neither a wish (≤ 3 lines), `[[Note]] · reason` nor `<recap> · done · [[Output]]`',
        );
      } // plan-canvas cards are parts, free text
      const { note, canvas } = cardLinks(node);
      if (note && note.startsWith(folder)) {
        const source = fileSystem.readFileSync(vaultPath(note), 'utf8');
        if (scoped) {
          const frontmatter = (source.match(/^---\n([\s\S]*?)\n---/) || [])[1];
          const keys = frontmatter
            ? [...frontmatter.matchAll(/^(\w[\w-]*):/gm)].map(
                (match) => match[1],
              )
            : [];
          if (keys.join() !== 'context') {
            add(
              `note frontmatter is not \`context\` only (${keys.join(', ') || 'none'})`,
            );
          }
          if (noteContexts(frontmatter).length !== 1) {
            add('note does not have exactly one context');
          }
          for (const section of ['Aim', 'Design']) {
            if (!new RegExp(`^## ${section}\\s*$`, 'm').test(source)) {
              add(`note has no ## ${section}`);
            }
          }
          if (!/^### Done when\s*$/m.test(source)) {
            add('note has no ### Done when (under Aim)');
          }
          if (node.color === '4' && !/^## Output\s*$/m.test(source)) {
            add('green card, note has no ## Output');
          }
        }
        if (
          node.color === WORKING &&
          Date.now() - fileSystem.statSync(vaultPath(note)).mtimeMs >
            ORANGE_STALE_MS
        ) {
          add('orange card, note untouched for 1h+ (interrupted pass?)');
        }
      }
      if (canvas && !seen.has(canvas) && depth < 2) {
        walk(canvas, depth + 1, seen);
      }
    }
  };
  const folder = notesFolder();
  walk(board, 0, new Set());
  return { issues };
}

module.exports = check;
