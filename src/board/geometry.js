import * as store from './store.js';

const WIKILINK_SHOWN_TEXT = /\[\[([^\]|]*\|)?([^\]]*)\]\]/g;
const DEPENDS_ON_LABEL = /depends on/i;

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

function byReading(first, second) {
  return first.y - second.y || first.x - second.x;
}

function centerDistance(first, second) {
  function center(node) {
    return [node.x + node.width / 2, node.y + node.height / 2];
  }
  const [firstX, firstY] = center(first);
  const [secondX, secondY] = center(second);
  return Math.hypot(firstX - secondX, firstY - secondY);
}

const GAP = 40;

// True when a moving card, shifted by `offset`, comes within GAP of a card
// in `others`.
function overlapsAny(moving, others, offset) {
  function isNear(card, other) {
    return (
      card.x + offset.x < other.x + other.width + GAP &&
      card.x + offset.x + card.width + GAP > other.x &&
      card.y + offset.y < other.y + other.height + GAP &&
      card.y + offset.y + card.height + GAP > other.y
    );
  }
  return moving.some((card) => others.some((other) => isNear(card, other)));
}

const STEP = 40;
const CENTERED_MAX_STEPS = 200;

// Centered on the card, then stepped right until nothing overlaps.
function centeredFreeOffset(nodes, card, others) {
  const box = bounds(nodes);
  const offset = {
    x: Math.round(card.x + (card.width - box.width) / 2) - box.x,
    y: Math.round(card.y + (card.height - box.height) / 2) - box.y,
  };
  for (let step = 0; step < CENTERED_MAX_STEPS; step++) {
    if (!overlapsAny(nodes, others, offset)) {
      break;
    }
    offset.x += STEP;
  }
  return offset;
}

// The first card in reading order, else the first node (all groups).
function firstInReading(nodes) {
  return (
    nodes.filter((node) => node.type !== 'group').sort(byReading)[0] || nodes[0]
  );
}

// Height that fits a text card's markdown at Obsidian's default canvas font
// (~8px a char, 26px a line).
function fitHeight(text, width) {
  const perLine = Math.max(10, Math.floor((width - 40) / 8));
  const lines = String(text || '')
    .split('\n')
    .reduce(
      (lines, line) =>
        lines +
        Math.max(
          1,
          Math.ceil(line.replace(WIKILINK_SHOWN_TEXT, '$2').length / perLine),
        ),
      0,
    );
  return Math.max(60, lines * 26 + 34);
}

const PADDING = 30;

function groupAround(nodes, label) {
  const left = Math.min(...nodes.map((node) => node.x)) - PADDING;
  const top = Math.min(...nodes.map((node) => node.y)) - PADDING;
  const right = Math.max(...nodes.map((node) => node.x + node.width));
  const bottom = Math.max(...nodes.map((node) => node.y + node.height));
  return {
    id: store.newId(),
    type: 'group',
    label,
    x: left,
    y: top,
    width: right + PADDING - left,
    height: bottom + PADDING - top,
  };
}

// The direction names where a branch starts, whichever way its arrows point.
// With flow 'in' (the fold direction) arrows point at the card they hang
// from, and "depends on" edges point at the prerequisite: both come first,
// so they rank reversed.
function isBackEdge(edge, flow) {
  return flow === 'in' || DEPENDS_ON_LABEL.test(edge.label || '');
}

function isTwoWay(edge) {
  return edge.fromEnd === 'arrow' && edge.toEnd !== 'none';
}

const MAX_STEPS = 400;
const ACROSS_ROWS = new Set(['LR', 'RL']);

// The block keeps the center the moving cards had; if it then overlaps a
// fixed card, it steps across the flow (down for LR and RL, right for TB and
// BT), alternating sides, to the nearest free spot.
function nearestFreeOffset(placed, { moving, fixed, direction }) {
  const before = bounds(moving);
  const after = bounds(placed);
  const center = {
    x: Math.round(
      (2 * before.x + before.width - 2 * after.x - after.width) / 2,
    ),
    y: Math.round(
      (2 * before.y + before.height - 2 * after.y - after.height) / 2,
    ),
  };
  const axis = ACROSS_ROWS.has(direction) ? 'y' : 'x';
  const offset = { ...center };
  for (let attempt = 1; attempt <= MAX_STEPS; attempt++) {
    if (!overlapsAny(placed, fixed, offset)) {
      break;
    }
    const side = attempt % 2 ? 1 : -1;
    offset[axis] = center[axis] + side * Math.ceil(attempt / 2) * STEP;
  }
  return offset;
}

function place(canvasData, { near, width, height }) {
  const nearNode = canvasData.nodes.find((node) => node.id === near);
  if (!nearNode) {
    throw new Error('no node ' + near);
  }
  function overlaps(left, top) {
    return canvasData.nodes.some(
      (node) =>
        left < node.x + node.width + 20 &&
        left + width + 20 > node.x &&
        top < node.y + node.height + 20 &&
        top + height + 20 > node.y,
    );
  }
  for (let step = 0; step < 20; step++) {
    const right = {
      x: nearNode.x + nearNode.width + 40,
      y: nearNode.y + step * (height + 40),
    };
    if (!overlaps(right.x, right.y)) {
      return right;
    }
    const below = {
      x: nearNode.x + step * (width + 40),
      y: nearNode.y + nearNode.height + 40,
    };
    if (!overlaps(below.x, below.y)) {
      return below;
    }
  }
  return { x: nearNode.x + nearNode.width + 40, y: nearNode.y };
}

// Cards inside a selected group come with it.
function withGroupMembers(canvasData, ids) {
  const pick = new Set(ids);
  const groups = canvasData.nodes.filter(
    (node) => node.type === 'group' && pick.has(node.id),
  );
  function isInside(node, group) {
    return (
      node.x >= group.x &&
      node.y >= group.y &&
      node.x + node.width <= group.x + group.width &&
      node.y + node.height <= group.y + group.height
    );
  }
  for (const node of canvasData.nodes) {
    if (groups.some((group) => isInside(node, group))) {
      pick.add(node.id);
    }
  }
  return pick;
}

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

// Ops that lay out `ids` (all cards when empty) with dagre; the other cards
// never move. Shared with the plugin, which passes its own dagre.
function layoutOps(canvasData, options) {
  const { ids, direction = 'TB', flow = 'out' } = options;
  const cards = canvasData.nodes.filter((node) => node.type !== 'group');
  const pick = new Set(ids && ids.length ? ids : cards.map((node) => node.id));
  const moving = cards.filter((node) => pick.has(node.id));
  const fixed = cards.filter((node) => !pick.has(node.id));
  if (!moving.length) {
    return [];
  }
  const inner = canvasData.edges.filter(
    (edge) => pick.has(edge.fromNode) && pick.has(edge.toNode),
  );
  const layout = { ...options, direction, flow };
  const placed = dagrePlacement(moving, inner, layout);
  const offset = nearestFreeOffset(placed, { moving, fixed, direction });
  const [fromSide, toSide] = store.SIDES[direction];
  function sides(edge) {
    return isBackEdge(edge, flow)
      ? { fromSide: toSide, toSide: fromSide }
      : { fromSide, toSide };
  }
  return [
    ...placed.map((card) => ({
      op: 'set',
      id: card.id,
      x: card.x + offset.x,
      y: card.y + offset.y,
      width: card.width,
      height: card.height,
    })),
    ...inner.map((edge) => ({ op: 'sides', id: edge.id, ...sides(edge) })),
  ];
}

function defaultDir() {
  return store.SIDES[store.settings().layoutDirection]
    ? store.settings().layoutDirection
    : 'TB';
}

export {
  bounds,
  byReading,
  centerDistance,
  overlapsAny,
  centeredFreeOffset,
  firstInReading,
  fitHeight,
  groupAround,
  isBackEdge,
  isTwoWay,
  nearestFreeOffset,
  place,
  withGroupMembers,
  dagrePlacement,
  layoutOps,
  defaultDir,
};
