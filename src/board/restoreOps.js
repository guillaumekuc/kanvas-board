const newId = require('./newId.js');

// Parses an archive note; returns { board, operations } that put the card back
// (same id if free) with the edges whose other end is still on the board.
function restoreOps(canvasData, source) {
  const frontmatter = (source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/) ||
    [])[1];
  if (!frontmatter || !/^archived-from:/m.test(frontmatter)) {
    throw new Error('not an archived card note');
  }
  function get(field) {
    const match = new RegExp(`^${field}: (.*)$`, 'm').exec(frontmatter);
    if (!match) return undefined;
    const value = match[1].trim();
    return value.startsWith('"') ? JSON.parse(value) : value;
  }
  const board = get('archived-from').replace(/^\[\[|\]\]$/g, '');
  const body = source
    .slice(source.indexOf('---', 3) + 3)
    .replace(/^\r?\n/, '')
    .replace(/\s+$/, '');
  const type = get('card-type') || 'text';
  const ids = new Set(canvasData.nodes.map((node) => node.id));
  const id = ids.has(get('card-id')) ? newId() : get('card-id');
  const node = {
    id,
    type,
    x: Number(get('x')),
    y: Number(get('y')),
    width: Number(get('width')),
    height: Number(get('height')),
  };
  if (type === 'text') node.text = body;
  if (type === 'file') node.file = get('card-file');
  if (type === 'link') node.url = get('card-url');
  if (get('color')) node.color = get('color');
  const operations = [{ op: 'add', node }];
  const old = get('card-id');
  const edgeIds = new Set(canvasData.edges.map((edge) => edge.id));
  for (const edgeLine of frontmatter.matchAll(/^ {2}- (".*")$/gm)) {
    const [edgeId, from, fromSide, toId, toSide, label] = JSON.parse(
      edgeLine[1],
    ).split(' | ');
    const fromNode = from === old ? id : from,
      toNode = toId === old ? id : toId;
    if (
      edgeIds.has(edgeId) ||
      !(fromNode === id || ids.has(fromNode)) ||
      !(toNode === id || ids.has(toNode))
    ) {
      continue;
    }
    const edge = { id: edgeId, fromNode, toNode };
    if (fromSide) edge.fromSide = fromSide;
    if (toSide) edge.toSide = toSide;
    if (label) edge.label = label;
    operations.push({ op: 'edge', edge });
  }
  return { board, operations };
}

module.exports = restoreOps;
