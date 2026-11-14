const newId = require('./newId.js');

// Parses an archive note; returns { board, ops } that put the card back (same id if free) with the edges whose
// other end is still on the board.
function restoreOps(d, src) {
  const fm = (src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/) || [])[1];
  if (!fm || !/^archived-from:/m.test(fm)) {throw new Error('not an archived card note');}
  const get = (k) => {
    const m = new RegExp(`^${k}: (.*)$`, 'm').exec(fm);
    if (!m) return undefined;
    const v = m[1].trim();
    return v.startsWith('"') ? JSON.parse(v) : v;
  };
  const board = get('archived-from').replace(/^\[\[|\]\]$/g, '');
  const body = src
    .slice(src.indexOf('---', 3) + 3)
    .replace(/^\r?\n/, '')
    .replace(/\s+$/, '');
  const type = get('card-type') || 'text';
  const ids = new Set(d.nodes.map((n) => n.id));
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
  const ops = [{ op: 'add', node }];
  const old = get('card-id');
  const edgeIds = new Set(d.edges.map((e) => e.id));
  for (const m of fm.matchAll(/^ {2}- (".*")$/gm)) {
    const [eid, from, fromSide, to, toSide, label] = JSON.parse(m[1]).split(
      ' | ',
    );
    const fromNode = from === old ? id : from,
      toNode = to === old ? id : to;
    if (
      edgeIds.has(eid) ||
      !(fromNode === id || ids.has(fromNode)) ||
      !(toNode === id || ids.has(toNode))
    ) {continue;}
    const edge = { id: eid, fromNode, toNode };
    if (fromSide) edge.fromSide = fromSide;
    if (toSide) edge.toSide = toSide;
    if (label) edge.label = label;
    ops.push({ op: 'edge', edge });
  }
  return { board, ops };
}

module.exports = restoreOps;
