// Distance between the centers of two cards.
function centerDistance(first, second) {
  const center = (node) => [node.x + node.width / 2, node.y + node.height / 2];
  const [firstX, firstY] = center(first);
  const [secondX, secondY] = center(second);
  return Math.hypot(firstX - secondX, firstY - secondY);
}

module.exports = centerDistance;
