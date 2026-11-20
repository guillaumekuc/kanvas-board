import path from 'path';
import {
  bounds,
  withGroupMembers,
  groupAround,
  centeredFreeOffset,
  firstInReading,
  fitHeight,
  byReading,
  centerDistance,
  isTwoWay,
} from './geometry.js';
import { newId, mostUrgent } from './store.js';

// Selected cards move to `file` (a new .canvas) at their relative places, with
// the edges between them; one card `[[file|label]]` takes their place, centered
// on where they were, and the edges that crossed the boundary now end on it.
function collapseOps(canvasData, { ids, file, label }) {
  const pick = withGroupMembers(canvasData, ids);
  const moving = canvasData.nodes.filter((node) => pick.has(node.id));
  if (!moving.length) {
    throw new Error('nothing to collapse');
  }
  const box = bounds(moving);
  const subcanvas = {
    nodes: moving.map((node) => ({
      ...node,
      x: node.x - box.x,
      y: node.y - box.y,
    })),
    edges: canvasData.edges.filter(
      (edge) => pick.has(edge.fromNode) && pick.has(edge.toNode),
    ),
  };
  const cardWidth = 320,
    cardHeight = 60;
  const card = {
    id: newId(),
    type: 'text',
    text: `[[${file}|${label}]]`,
    x: Math.round(box.x + (box.width - cardWidth) / 2),
    y: Math.round(box.y + (box.height - cardHeight) / 2),
    width: cardWidth,
    height: cardHeight,
  };
  const operations = [{ op: 'add', node: card }];
  for (const edge of canvasData.edges) {
    const from = pick.has(edge.fromNode),
      isToInside = pick.has(edge.toNode);
    if (from !== isToInside) {
      operations.push({
        op: 'retarget',
        id: edge.id,
        fromNode: from ? card.id : edge.fromNode,
        toNode: isToInside ? card.id : edge.toNode,
      });
    }
  }
  for (const node of moving) {
    operations.push({ op: 'remove', id: node.id });
  }
  return { operations, subcanvas, id: card.id };
}

// Edges that touch card `fromId` move their end to card `toId`.
function retargetOps(edges, fromId, toId) {
  return edges
    .filter((edge) => edge.fromNode === fromId || edge.toNode === fromId)
    .map((edge) => ({
      op: 'retarget',
      id: edge.id,
      fromNode: edge.fromNode === fromId ? toId : edge.fromNode,
      toNode: edge.toNode === fromId ? toId : edge.toNode,
    }));
}

// The reverse (unpack): the subcanvas's cards come back centered on the card,
// shifted right until they overlap nothing; edges on the card go to the first
// of them in reading order. The caller trashes the .canvas file (dissolve) or
// keeps it (copy). With `group` (a label), a group is drawn around them and
// the edges on the card go to it.
function expandOps(canvasData, { id, subcanvas, group }) {
  const card = canvasData.nodes.find((node) => node.id === id);
  if (!card) {
    throw new Error('no node ' + id);
  }
  if (!subcanvas.nodes.length) {
    throw new Error('empty subcanvas');
  }
  const taken = new Set(
    [...canvasData.nodes, ...canvasData.edges].map((item) => item.id),
  );
  function freeId(itemId) {
    return taken.has(itemId) ? newId() : itemId;
  }
  const ids = new Map(
    subcanvas.nodes.map((node) => [node.id, freeId(node.id)]),
  );
  const others = canvasData.nodes.filter((node) => node.id !== id);
  const offset = centeredFreeOffset(subcanvas.nodes, card, others);
  const nodes = subcanvas.nodes.map((node) => ({
    ...node,
    id: ids.get(node.id),
    x: node.x + offset.x,
    y: node.y + offset.y,
  }));
  // The group is added first so it is drawn behind the cards.
  const frame = group ? groupAround(nodes, group) : null;
  const target = frame || firstInReading(nodes);
  const edges = subcanvas.edges.map((edge) => ({
    ...edge,
    id: freeId(edge.id),
    fromNode: ids.get(edge.fromNode),
    toNode: ids.get(edge.toNode),
  }));
  const operations = [
    ...(frame ? [{ op: 'add', node: frame }] : []),
    ...nodes.map((node) => ({ op: 'add', node })),
    ...edges.map((edge) => ({ op: 'edge', edge })),
    ...retargetOps(canvasData.edges, id, target.id),
    { op: 'remove', id },
  ];
  return frame ? Object.assign(operations, { group: frame.id }) : operations;
}

// `part` (a piece of the card's text, e.g. the editor selection) leaves the
// card for a new card next to it.
function extractOps(canvasData, { id, part, from }) {
  const card = canvasData.nodes.find((node) => node.id === id);
  if (!card || card.type !== 'text') {
    throw new Error('extract takes one text card');
  }
  const offset =
    from !== undefined && card.text.slice(from, from + part.length) === part
      ? from
      : card.text.indexOf(part);
  if (!part.trim() || offset < 0) {
    throw new Error('text not found in the card');
  }
  const left = (
    card.text.slice(0, offset) + card.text.slice(offset + part.length)
  )
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const text = part.trim();
  const height = fitHeight(text, card.width);
  // Right next to the card even if it overlaps another (seen beats tidy), on
  // top of the stack (added last); stepped down only so repeated extracts don't
  // hide each other exactly.
  let top = card.y;
  while (
    canvasData.nodes.some(
      (node) => node.x === card.x + card.width + 40 && node.y === top,
    )
  ) {
    top += 40;
  }
  const node = {
    id: newId(),
    type: 'text',
    text,
    x: card.x + card.width + 40,
    y: top,
    width: card.width,
    height,
  };
  if (card.color) {
    node.color = card.color;
  }
  return [
    { op: 'set', id, text: left, height: fitHeight(left, card.width) },
    { op: 'add', node },
  ];
}

// Edges between the merged cards and one other card end up as one: a two-way
// edge if there was one or they went both ways, else the one from the merged
// card closest to it. `links`: [{ edge, isOutgoing, length }].
function keptEdgeOps(links, { keep, gone }) {
  const sorted = [...links].sort(
    (first, second) => first.length - second.length,
  );
  const best = sorted.find((link) => isTwoWay(link.edge)) || sorted[0];
  const hasBothWays =
    links.some((link) => link.isOutgoing) &&
    links.some((link) => !link.isOutgoing);
  const operations = sorted
    .filter((link) => link !== best)
    .map((link) => ({ op: 'unedge', id: link.edge.id }));
  const { edge } = best;
  if (gone.has(edge.fromNode) || gone.has(edge.toNode)) {
    operations.push({
      op: 'retarget',
      id: edge.id,
      fromNode: gone.has(edge.fromNode) ? keep.id : edge.fromNode,
      toNode: gone.has(edge.toNode) ? keep.id : edge.toNode,
    });
  }
  if (hasBothWays && !isTwoWay(edge)) {
    operations.push({
      op: 'ends',
      id: edge.id,
      fromEnd: 'arrow',
      toEnd: 'arrow',
    });
  }
  return operations;
}

// Edges between the merged cards are dropped; edges to the same other card
// become one (see keptEdgeOps).
function mergeEdgeOps(canvasData, { keep, gone }) {
  const merged = new Set([keep.id, ...gone]);
  function nodeById(id) {
    return canvasData.nodes.find((node) => node.id === id);
  }
  const operations = [];
  const linksByOther = new Map();
  for (const edge of canvasData.edges) {
    const isOutgoing = merged.has(edge.fromNode);
    const isIncoming = merged.has(edge.toNode);
    const isInside = isOutgoing && isIncoming;
    const touchesGone = gone.has(edge.fromNode) || gone.has(edge.toNode);
    if (isInside && touchesGone) {
      operations.push({ op: 'unedge', id: edge.id });
    }
    if (isInside || (!isOutgoing && !isIncoming)) {
      continue;
    }
    const [mine, other] = isOutgoing
      ? [edge.fromNode, edge.toNode]
      : [edge.toNode, edge.fromNode];
    const length = centerDistance(nodeById(mine), nodeById(other) || keep);
    if (!linksByOther.has(other)) {
      linksByOther.set(other, []);
    }
    linksByOther.get(other).push({ edge, isOutgoing, length });
  }
  for (const links of linksByOther.values()) {
    operations.push(...keptEdgeOps(links, { keep, gone }));
  }
  return operations;
}

// Text cards become the first one (in reading order): texts joined by a
// blank line, the most urgent color, every edge (see mergeEdgeOps).
function mergeOps(canvasData, ids) {
  const cards = canvasData.nodes
    .filter((node) => ids.includes(node.id))
    .sort(byReading);
  if (cards.length < 2) {
    throw new Error('merge needs 2+ cards');
  }
  if (cards.some((node) => node.type !== 'text')) {
    throw new Error('merge takes text cards only');
  }
  const [keep, ...rest] = cards;
  const gone = new Set(rest.map((node) => node.id));
  const text = cards.map((node) => node.text.trim()).join('\n\n');
  const width = Math.max(...cards.map((node) => node.width));
  const color = mostUrgent(cards.map((node) => node.color || ''));
  const height = fitHeight(text, width);
  return [
    { op: 'set', id: keep.id, text, color, width, height },
    ...mergeEdgeOps(canvasData, { keep, gone }),
    ...rest.map((node) => ({ op: 'remove', id: node.id })),
  ];
}

// separator: paragraph (blank lines), bullet (top-level list items), h1..h6 (a
// new piece at each heading of that level).
function splitText(text, separator) {
  const headingMatch = /^h([1-6])$/.exec(separator);
  const starts = headingMatch
    ? new RegExp(`^#{${headingMatch[1]}} `)
    : separator === 'bullet'
      ? /^([-*+]|\d+[.)]) /
      : null;
  const pieces = starts
    ? text
        .split('\n')
        .reduce((pieces, line) => {
          if (starts.test(line) || !pieces.length) {
            pieces.push([]);
          }
          pieces[pieces.length - 1].push(line);
          return pieces;
        }, [])
        .map((pieceLines) => pieceLines.join('\n'))
    : text.split(/\n\s*\n/);
  return pieces.map((piece) => piece.trim()).filter(Boolean);
}

// One text card becomes one card per piece, stacked under it; the first keeps
// the id, color and edges.
function splitOps(canvasData, id, separator = 'paragraph') {
  const card = canvasData.nodes.find((node) => node.id === id);
  if (!card || card.type !== 'text') {
    throw new Error('split takes one text card');
  }
  const pieces = splitText(card.text || '', separator);
  if (pieces.length < 2) {
    throw new Error(`nothing to split by ${separator}`);
  }
  let top = card.y;
  return pieces.map((text, index) => {
    const height = fitHeight(text, card.width);
    const node = {
      ...card,
      id: index ? newId() : card.id,
      text,
      y: top,
      height,
    };
    top += height + 20;
    return index ? { op: 'add', node } : { op: 'set', id, text, height };
  });
}

// Card text without Markdown syntax, one string per non-empty line, for lists
// (filter pane): [[Note|alias]] → alias, [[Note#Heading]] → Note › Heading,
// [[Note]] → Note, [text](url) → text; marks (** __ ~~ == ` * _), heading,
// quote, list and checkbox markers dropped; #tags kept.
function plainLines(text) {
  function name(linkTarget) {
    return linkTarget
      .replace(/\.(md|canvas)$/, '')
      .split('/')
      .pop();
  }
  return String(text || '')
    .split('\n')
    .map((line) =>
      line
        .replace(/!?\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
        .replace(
          /!?\[\[([^\]#]*)#\^?([^\]]+)\]\]/g,
          (match, linkTarget, heading) =>
            linkTarget ? `${name(linkTarget)} › ${heading}` : heading,
        )
        .replace(/!?\[\[([^\]]+)\]\]/g, (match, linkTarget) => name(linkTarget))
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/^\s*(#{1,6}\s+|>\s*|[-*+]\s+(\[.\]\s+)?|\d+[.)]\s+)/, '')
        .replace(/\*\*|__|~~|==|`/g, '')
        .replace(/(^|\W)[*_](\S[^*_]*?)[*_](?=\W|$)/g, '$1$2')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean);
}

// Wikilinks (and embeds) in `text` whose target `hits(linkpath)` become
// `replace(label)`; label = alias, else file name.
function relinkText(text, hits, replace) {
  return (text || '').replace(
    /!?\[\[([^\]|#]+)(#[^\]|]*)?(?:\|([^\]]*))?\]\]/g,
    (link, ...groups) => {
      const [target, , alias] = groups; // the #subpath group is not needed
      if (!hits(target.trim())) {
        return link;
      }
      const name = path.posix.basename(target.trim()).replace(/\.canvas$/, '');
      return replace(alias || name);
    },
  );
}

// A template is a .canvas file (Templates/Canvas/). Its cards get new ids and
// land with their top-left at `origin`.
function templateOps(template, origin) {
  const nodes = template.nodes || [];
  if (!nodes.length) {
    throw new Error('empty template');
  }
  const minX = Math.min(...nodes.map((node) => node.x)),
    minY = Math.min(...nodes.map((node) => node.y));
  const ids = new Map(nodes.map((node) => [node.id, newId()]));
  const operations = nodes.map((node) => ({
    op: 'add',
    node: {
      ...node,
      id: ids.get(node.id),
      x: node.x - minX + origin.x,
      y: node.y - minY + origin.y,
    },
  }));
  for (const edge of template.edges || []) {
    if (ids.has(edge.fromNode) && ids.has(edge.toNode)) {
      operations.push({
        op: 'edge',
        edge: {
          ...edge,
          id: newId(),
          fromNode: ids.get(edge.fromNode),
          toNode: ids.get(edge.toNode),
        },
      });
    }
  }
  return operations;
}

export {
  collapseOps,
  retargetOps,
  expandOps,
  extractOps,
  keptEdgeOps,
  mergeEdgeOps,
  mergeOps,
  splitText,
  splitOps,
  plainLines,
  relinkText,
  templateOps,
};
