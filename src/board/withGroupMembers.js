// Cards inside a selected group come with it.
function withGroupMembers(canvasData, ids) {
  const pick = new Set(ids);
  for (const group of canvasData.nodes.filter(
    (node) => node.type === 'group' && pick.has(node.id),
  )) {
    for (const node of canvasData.nodes) {
      if (
        node.x >= group.x &&
        node.y >= group.y &&
        node.x + node.width <= group.x + group.width &&
        node.y + node.height <= group.y + group.height
      ) {
        pick.add(node.id);
      }
    }
  }
  return pick;
}

module.exports = withGroupMembers;
