// One card or edge per line, as Obsidian writes canvas files, so diffs stay
// readable.
function serialize(canvasData) {
  const lines = (items) =>
    items.map((item) => '\t\t' + JSON.stringify(item)).join(',\n');
  return (
    `{\n\t"nodes":[\n${lines(canvasData.nodes)}\n\t],\n` +
    `\t"edges":[\n${lines(canvasData.edges)}\n\t]\n}\n`
  );
}

module.exports = serialize;
