// Shared by both modes: runs in Node on the parsed file, or inside Obsidian (plugin) on canvas.getData().
function applyOps(canvasData, operations) {
  const retyped = [];
  for (const operation of operations) {
    if (operation.op === 'set') {
      const node = canvasData.nodes.find((node) => node.id === operation.id);
      if (!node) throw new Error('no node ' + operation.id);
      if (operation.color !== undefined) {
        if (operation.color) node.color = operation.color;
        else delete node.color;
      }
      if (operation.file !== undefined) {
        if (node.type !== 'file') retyped.push(node.id);
        node.type = 'file';
        node.file = operation.file;
        delete node.text;
      }
      if (operation.text !== undefined) {
        if (node.type !== 'text') retyped.push(node.id);
        node.type = 'text';
        node.text = operation.text;
        delete node.file;
      }
      for (const field of ['x', 'y', 'width', 'height']) {
        if (operation[field] !== undefined) node[field] = operation[field];
      }
    } else if (operation.op === 'sides') {
      const edge = canvasData.edges.find((edge) => edge.id === operation.id);
      if (edge) {
        edge.fromSide = operation.fromSide;
        edge.toSide = operation.toSide;
      }
    } else if (operation.op === 'add') canvasData.nodes.push(operation.node);
    else if (operation.op === 'remove') {
      canvasData.nodes = canvasData.nodes.filter(
        (node) => node.id !== operation.id,
      );
      canvasData.edges = canvasData.edges.filter(
        (edge) =>
          edge.fromNode !== operation.id && edge.toNode !== operation.id,
      );
    } else if (operation.op === 'edge') canvasData.edges.push(operation.edge);
    else if (operation.op === 'retarget') {
      const edge = canvasData.edges.find((edge) => edge.id === operation.id);
      if (edge) {
        edge.fromNode = operation.fromNode;
        edge.toNode = operation.toNode;
      }
    } else if (operation.op === 'ends') {
      const edge = canvasData.edges.find((edge) => edge.id === operation.id);
      if (edge) {
        edge.fromEnd = operation.fromEnd;
        edge.toEnd = operation.toEnd;
      }
    } else if (operation.op === 'unedge') {
      canvasData.edges = canvasData.edges.filter(
        (edge) => edge.id !== operation.id,
      );
    }
  }
  return retyped;
}

module.exports = applyOps;
