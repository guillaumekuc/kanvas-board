const applyToOpenCanvas = require('./applyToOpenCanvas.js');

// What canvas.js calls through `obsidian eval` while a board is open, so
// Obsidian never saves its in-memory copy over an agent's edit. null: the
// board is not open, canvas.js edits the file itself.
function createApi(plugin) {
  return {
    read: (board) => {
      const canvas = plugin.openCanvas(board);
      return canvas ? JSON.stringify(canvas.getData()) : null;
    },
    apply: async (board, operations) => {
      const canvas = plugin.openCanvas(board);
      return canvas ? applyToOpenCanvas(canvas, operations) : null;
    },
  };
}

module.exports = createApi;
