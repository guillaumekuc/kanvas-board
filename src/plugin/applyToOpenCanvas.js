const applyOps = require('../board/applyOps.js');

// requestSave() saves after a debounce: waiting lets the file on disk catch
// up before canvas.js goes on.
const SAVE_DELAY_MS = 2500;

// Changing a card's type needs setData() without the card, then with it, to
// keep its id.
async function applyToOpenCanvas(canvas, operations) {
  const canvasData = canvas.getData();
  const retyped = applyOps(canvasData, operations);
  if (retyped.length) {
    const nodes = canvasData.nodes.filter((node) => !retyped.includes(node.id));
    canvas.setData({ ...canvasData, nodes });
  }
  canvas.setData(canvasData);
  canvas.requestSave();
  await new Promise((resolve) => setTimeout(resolve, SAVE_DELAY_MS));
  return 'obsidian';
}

module.exports = applyToOpenCanvas;
