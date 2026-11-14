const abs = require('./abs.js');
const cardLinks = require('./cardLinks.js');
const fs = require('fs');
const readBoard = require('./readBoard.js');

// Board + linked notes (path, age; `noteInfo(path)` adds more, workflow.js passes the level) + nested canvases.
function tree(board, { noteInfo } = {}, depth = 0, seen = new Set()) {
  seen.add(board);
  const d = readBoard(board);
  return {
    board,
    cards: d.nodes.filter(n => n.type !== 'group').map(n => {
      const { note, canvas } = cardLinks(n);
      const card = { id: n.id, color: n.color || null, text: n.type === 'text' ? n.text : undefined, file: n.file };
      if (note) {
        const ageDays = Math.floor((Date.now() - fs.statSync(abs(note)).mtimeMs) / 86400000);
        card.note = { path: note, ageDays, ...(noteInfo ? noteInfo(note) : {}) };
      }
      if (canvas && !seen.has(canvas) && depth < 2) card.inside = tree(canvas, { noteInfo }, depth + 1, seen);
      return card;
    }),
    edges: d.edges.map(e => ({ from: e.fromNode, to: e.toNode, label: e.label })),
  };
}

module.exports = tree;
