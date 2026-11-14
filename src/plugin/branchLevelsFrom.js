// The ids reached from `root` through `links` (id → ids), level by level
// (level 1 first); each id once, at its nearest level.
function branchLevelsFrom(links, root) {
  const seen = new Set([root]);
  const isNew = (id) => !seen.has(id) && Boolean(seen.add(id));
  const levels = [];
  let level = [root];
  while (level.length) {
    level = level.flatMap((id) => links.get(id) || []).filter(isNew);
    if (level.length) levels.push(level);
  }
  return levels;
}

module.exports = branchLevelsFrom;
