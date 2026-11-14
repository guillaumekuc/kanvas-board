const bounds = (nodes) => {
  const x = Math.min(...nodes.map((node) => node.x)),
    y = Math.min(...nodes.map((node) => node.y));
  return {
    x,
    y,
    w: Math.max(...nodes.map((node) => node.x + node.width)) - x,
    h: Math.max(...nodes.map((node) => node.y + node.height)) - y,
  };
};

module.exports = bounds;
