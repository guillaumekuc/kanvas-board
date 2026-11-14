// Cards inside a selected group come with it.
function withGroupMembers(canvasData, ids) {
  const pick = new Set(ids);
  const groups = canvasData.nodes.filter(
    (node) => node.type === 'group' && pick.has(node.id),
  );
  const isInside = (node, group) =>
    node.x >= group.x &&
    node.y >= group.y &&
    node.x + node.width <= group.x + group.width &&
    node.y + node.height <= group.y + group.height;
  for (const node of canvasData.nodes) {
    if (groups.some((group) => isInside(node, group))) pick.add(node.id);
  }
  return pick;
}

module.exports = withGroupMembers;
