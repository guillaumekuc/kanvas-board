

// Cards inside a selected group come with it.
function withGroupMembers(d, ids) {
  const pick = new Set(ids);
  for (const g of d.nodes.filter(n => n.type === 'group' && pick.has(n.id)))
    for (const n of d.nodes) if (n.x >= g.x && n.y >= g.y && n.x + n.width <= g.x + g.width && n.y + n.height <= g.y + g.height) pick.add(n.id);
  return pick;
}

module.exports = withGroupMembers;
