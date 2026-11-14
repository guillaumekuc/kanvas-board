const newId = require('../../board/newId.js');

// Cards on this canvas that linked the subcanvas keep their text without the
// link (a file card shows the label) and get an edge to the new group.
function groupLinkOperations(plugin, canvas, unpacked) {
  const { here, label, isSubcanvas, links, groupId } = unpacked;
  const library = plugin.boardLibrary;
  const [fromSide, toSide] =
    library.SIDES[plugin.settings.layoutDirection] || library.SIDES.TB;
  const nodes = canvas.getData().nodes;
  const linking = links
    .filter((link) => link.path === here)
    .map((link) => nodes.find((node) => node.id === link.id))
    .filter(Boolean);
  return linking.flatMap((node) => [
    {
      op: 'set',
      id: node.id,
      text:
        node.type === 'text'
          ? library.relinkText(node.text, isSubcanvas(here), (text) => text)
          : label,
    },
    {
      op: 'edge',
      edge: {
        id: newId(),
        fromNode: node.id,
        fromSide,
        toNode: groupId,
        toSide,
      },
    },
  ]);
}

module.exports = groupLinkOperations;
