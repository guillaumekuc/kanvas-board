const fitHeight = require('./fitHeight.js');
const isBackEdge = require('./isBackEdge.js');

const GRAPH = { nodesep: 40, ranksep: 80, marginx: 0, marginy: 0 };

// Returns each card's top-left corner and size (dagre gives centers).
function dagrePlacement(moving, inner, layout) {
  const { dagre, direction, flow, isFitToText } = layout;
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ ...GRAPH, rankdir: direction });
  graph.setDefaultEdgeLabel(() => ({}));
  for (const node of moving) {
    const isFitted = isFitToText && node.type === 'text';
    const height = isFitted ? fitHeight(node.text, node.width) : node.height;
    graph.setNode(node.id, { width: node.width, height });
  }
  for (const edge of inner) {
    const [source, target] = isBackEdge(edge, flow)
      ? [edge.toNode, edge.fromNode]
      : [edge.fromNode, edge.toNode];
    graph.setEdge(source, target);
  }
  dagre.layout(graph);
  return moving.map((node) => {
    const position = graph.node(node.id);
    return {
      id: node.id,
      x: Math.round(position.x - position.width / 2),
      y: Math.round(position.y - position.height / 2),
      width: position.width,
      height: position.height,
    };
  });
}

module.exports = dagrePlacement;
