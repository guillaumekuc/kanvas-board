function centerDistance(first, second) {
  function center(node) {
    return [node.x + node.width / 2, node.y + node.height / 2];
  }
  const [firstX, firstY] = center(first);
  const [secondX, secondY] = center(second);
  return Math.hypot(firstX - secondX, firstY - secondY);
}

module.exports = centerDistance;
