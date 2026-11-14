const vaultPath = require('./vaultPath.js');
const cardLinks = require('./cardLinks.js');
const fileSystem = require('fs');
const readBoard = require('./readBoard.js');

// Board + linked notes (path, age; `noteInfo(path)` adds more, workflow.js passes the level) + nested canvases.
function tree(board, { noteInfo } = {}, depth = 0, seen = new Set()) {
  seen.add(board);
  const canvasData = readBoard(board);
  return {
    board,
    cards: canvasData.nodes
      .filter((node) => node.type !== 'group')
      .map((node) => {
        const { note, canvas } = cardLinks(node);
        const card = {
          id: node.id,
          color: node.color || null,
          text: node.type === 'text' ? node.text : undefined,
          file: node.file,
        };
        if (note) {
          const ageDays = Math.floor(
            (Date.now() - fileSystem.statSync(vaultPath(note)).mtimeMs) /
              86400000,
          );
          card.note = {
            path: note,
            ageDays,
            ...(noteInfo ? noteInfo(note) : {}),
          };
        }
        if (canvas && !seen.has(canvas) && depth < 2) {
          card.inside = tree(canvas, { noteInfo }, depth + 1, seen);
        }
        return card;
      }),
    edges: canvasData.edges.map((edge) => ({
      from: edge.fromNode,
      to: edge.toNode,
      label: edge.label,
    })),
  };
}

module.exports = tree;
