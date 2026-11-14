function place(d, near, w, h) {
  const p = d.nodes.find((n) => n.id === near);
  if (!p) throw new Error('no node ' + near);
  const overlaps = (x, y) =>
    d.nodes.some(
      (n) =>
        x < n.x + n.width + 20 &&
        x + w + 20 > n.x &&
        y < n.y + n.height + 20 &&
        y + h + 20 > n.y,
    );
  for (let k = 0; k < 20; k++) {
    const right = { x: p.x + p.width + 40, y: p.y + k * (h + 40) };
    if (!overlaps(right.x, right.y)) return right;
    const below = { x: p.x + k * (w + 40), y: p.y + p.height + 40 };
    if (!overlaps(below.x, below.y)) return below;
  }
  return { x: p.x + p.width + 40, y: p.y };
}

module.exports = place;
