function serialize(d) {
  const line = (x) => '\t\t' + JSON.stringify(x);
  return `{\n\t"nodes":[\n${d.nodes.map(line).join(',\n')}\n\t],\n\t"edges":[\n${d.edges.map(line).join(',\n')}\n\t]\n}\n`;
}

module.exports = serialize;
