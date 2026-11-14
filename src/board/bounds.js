// Selected cards move to `file` (a new .canvas) at their relative places, with the edges between them; one card
// `[[file|label]]` takes their place, centered on where they were, and the edges that crossed the boundary now end on it.
const bounds = (nodes) => {
  const x = Math.min(...nodes.map((node) => node.x)),
    y = Math.min(...nodes.map((node) => node.y));
  return {
    x,
    y,
    w: Math.max(...nodes.map((node) => node.x + node.width)) - x,
    h: Math.max(...nodes.map((node) => node.y + node.height)) - y,
  };
};

module.exports = bounds;
