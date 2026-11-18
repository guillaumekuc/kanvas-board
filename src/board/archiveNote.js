const noteName = require('./noteName.js');
const yamlStr = require('./yamlStr.js');

// An archived card becomes a note (body = its text, or a link to its file)
// whose frontmatter keeps what a restore needs: board, id, place, size, color
// and its edges. Listed by Canvas archive.base. Returns { name, content,
// operations }. `contexts`: the context of the note the archived card links,
// else data.json `archiveContexts`, else none.
function archiveNote(canvasData, { id, board, date, contexts = [] }) {
  const node = canvasData.nodes.find((node) => node.id === id);
  if (!node) throw new Error('no node ' + id);
  const edges = canvasData.edges
    .filter((edge) => edge.fromNode === id || edge.toNode === id)
    .map((edge) =>
      yamlStr(
        [
          edge.id,
          edge.fromNode,
          edge.fromSide || '',
          edge.toNode,
          edge.toSide || '',
          edge.label || '',
        ].join(' | '),
      ),
    );
  const frontmatter = [
    '---',
    ...(contexts.length ? ['context:'] : []),
    ...contexts.map((context) => `  - ${context}`),
    `archived-from: "[[${board}]]"`,
    `archived: ${date}`,
    `card-id: ${yamlStr(node.id)}`,
    `card-type: ${node.type}`,
    ...(node.type === 'file' ? [`card-file: ${yamlStr(node.file)}`] : []),
    ...(node.type === 'link' ? [`card-url: ${yamlStr(node.url)}`] : []),
    `x: ${node.x}`,
    `y: ${node.y}`,
    `width: ${node.width}`,
    `height: ${node.height}`,
    `color: ${yamlStr(node.color || '')}`,
    edges.length ? 'edges:' : 'edges: []',
    ...edges.map((edge) => `  - ${edge}`),
    '---',
    '',
  ].join('\n');
  const body =
    node.type === 'text'
      ? node.text
      : node.type === 'file'
        ? `[[${node.file}]]`
        : node.type === 'link'
          ? node.url
          : node.label || '';
  return {
    name: noteName(
      node.type === 'text' ? node.text : node.file || node.url || node.label,
    ),
    content: frontmatter + body + '\n',
    operations: [{ op: 'remove', id }],
  };
}

module.exports = archiveNote;
