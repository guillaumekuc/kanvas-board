function place(canvasData, { near, width, height }) {
  const nearNode = canvasData.nodes.find((node) => node.id === near);
  if (!nearNode) throw new Error('no node ' + near);
  function overlaps(left, top) {
    return canvasData.nodes.some(
      (node) =>
        left < node.x + node.width + 20 &&
        left + width + 20 > node.x &&
        top < node.y + node.height + 20 &&
        top + height + 20 > node.y,
    );
  }
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
