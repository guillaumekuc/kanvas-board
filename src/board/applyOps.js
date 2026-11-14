const OPERATION_HANDLERS = require('./operations/handlers.js');

// Shared by both modes: runs in Node on the parsed file, or inside Obsidian
// (plugin) on canvas.getData(). Returns the ids of cards whose type changed.
function applyOps(canvasData, operations) {
  const retyped = [];
  for (const operation of operations) {
    const handler = OPERATION_HANDLERS[operation.op];
    const retypedIds = handler ? handler(canvasData, operation) : null;
    if (retypedIds) retyped.push(...retypedIds);
  }
  return retyped;
}

module.exports = applyOps;
