function serialize(canvasData) {
  const line = (x) => '\t\t' + JSON.stringify(x);
  return `{\n\t"nodes":[\n${canvasData.nodes.map(line).join(',\n')}\n\t],\n\t"edges":[\n${canvasData.edges.map(line).join(',\n')}\n\t]\n}\n`;
}

module.exports = serialize;
