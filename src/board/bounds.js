function bounds(nodes) {
  const left = Math.min(...nodes.map((node) => node.x)),
    top = Math.min(...nodes.map((node) => node.y));
  return {
    x: left,
    y: top,
    width: Math.max(...nodes.map((node) => node.x + node.width)) - left,
    height: Math.max(...nodes.map((node) => node.y + node.height)) - top,
  };
}

module.exports = bounds;
