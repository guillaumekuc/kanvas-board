const cardIssues = require('./cardIssues.js');
const cardLinks = require('../board/cardLinks.js');
const isStaleOrange = require('./isStaleOrange.js');
const noteIssues = require('./noteIssues.js');
const notesFolder = require('./notesFolder.js');
const readOrNull = require('../board/readOrNull.js');
const readBoard = require('../board/readBoard.js');

const MAX_DEPTH = 2;
const STALE = 'orange card, note untouched for 1h+ (interrupted pass?)';

// ids: the cards a pass worked on. The check constrains what agents write,
// not what User does with the cards afterwards (merged cards, headings), so a
// pass passes its inventory plus the cards it added. Interrupted passes
// (stale orange) are always reported. Without ids: every colored card, as an
// audit.
function check(board, ids) {
  const folder = notesFolder();
  const issues = [];
  const seen = new Set();
  function walk(current, depth) {
    seen.add(current);
    const colored = readBoard(current).nodes.filter(
      (node) => node.type !== 'group' && node.color,
    );
    for (const node of colored) {
      const isScoped = !ids || ids.has(node.id);
      const { note, canvas } = cardLinks(node);
      const isPlanNote = Boolean(note && note.startsWith(folder));
      const found = [
        ...(isScoped ? cardIssues(node, depth) : []),
        ...(isScoped && isPlanNote
          ? noteIssues(readOrNull(note) || '', node.color)
          : []),
        ...(isPlanNote && isStaleOrange(node, note) ? [STALE] : []),
      ];
      const text = (node.text || node.file || '').split('\n')[0];
      issues.push(
        ...found.map((issue) => ({ board: current, id: node.id, text, issue })),
      );
      if (canvas && !seen.has(canvas) && depth < MAX_DEPTH) {
        walk(canvas, depth + 1);
      }
    }
  }
  walk(board, 0);
  return { issues };
}

module.exports = check;
