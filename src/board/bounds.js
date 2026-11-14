

// Selected cards move to `file` (a new .canvas) at their relative places, with the edges between them; one card
// `[[file|label]]` takes their place, centered on where they were, and the edges that crossed the boundary now end on it.
const bounds = ns => {
  const x = Math.min(...ns.map(n => n.x)), y = Math.min(...ns.map(n => n.y));
  return { x, y, w: Math.max(...ns.map(n => n.x + n.width)) - x, h: Math.max(...ns.map(n => n.y + n.height)) - y };
};

module.exports = bounds;
