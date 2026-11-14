const noteName = require('./noteName.js');
const yamlStr = require('./yamlStr.js');

// Returns { name, content, ops }. `contexts`: the context of the note the archived card links, else G&A.
function archiveNote(d, id, board, date, contexts = ['G&A']) {
  const n = d.nodes.find(n => n.id === id);
  if (!n) throw new Error('no node ' + id);
  const edges = d.edges.filter(e => e.fromNode === id || e.toNode === id)
    .map(e => yamlStr([e.id, e.fromNode, e.fromSide || '', e.toNode, e.toSide || '', e.label || ''].join(' | ')));
  const fm = [
    '---', 'context:', ...contexts.map(c => `  - ${c}`),
    `archived-from: "[[${board}]]"`, `archived: ${date}`, `card-id: ${yamlStr(n.id)}`, `card-type: ${n.type}`,
    ...(n.type === 'file' ? [`card-file: ${yamlStr(n.file)}`] : []), ...(n.type === 'link' ? [`card-url: ${yamlStr(n.url)}`] : []),
    `x: ${n.x}`, `y: ${n.y}`, `width: ${n.width}`, `height: ${n.height}`, `color: ${yamlStr(n.color || '')}`,
    edges.length ? 'edges:' : 'edges: []', ...edges.map(e => `  - ${e}`), '---', '',
  ].join('\n');
  const body = n.type === 'text' ? n.text : n.type === 'file' ? `[[${n.file}]]` : n.type === 'link' ? n.url : n.label || '';
  return { name: noteName(n.type === 'text' ? n.text : n.file || n.url || n.label), content: fm + body + '\n', ops: [{ op: 'remove', id }] };
}

module.exports = archiveNote;
