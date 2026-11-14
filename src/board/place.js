function place(canvasData, { near, width, height }) {
  const nearNode = canvasData.nodes.find((node) => node.id === near);
  if (!nearNode) throw new Error('no node ' + near);
  const overlaps = (x, y) =>
    canvasData.nodes.some(
      (node) =>
        x < node.x + node.width + 20 &&
        x + width + 20 > node.x &&
        y < node.y + node.height + 20 &&
        y + height + 20 > node.y,
    );
  for (let step = 0; step < 20; step++) {
    const right = {
      x: nearNode.x + nearNode.width + 40,
      y: nearNode.y + step * (height + 40),
    };
    if (!overlaps(right.x, right.y)) return right;
    const below = {
      x: nearNode.x + step * (width + 40),
      y: nearNode.y + nearNode.height + 40,
    };
    if (!overlaps(below.x, below.y)) return below;
  }
  return { x: nearNode.x + nearNode.width + 40, y: nearNode.y };
}

module.exports = place;
