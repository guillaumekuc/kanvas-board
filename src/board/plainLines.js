// Card text without Markdown syntax, one string per non-empty line, for lists (filter pane):
// [[Note|alias]] → alias, [[Note#Heading]] → Note › Heading, [[Note]] → Note, [text](url) → text; marks
// (** __ ~~ == ` * _), heading, quote, list and checkbox markers dropped; #tags kept.
function plainLines(text) {
  const name = (node) =>
    node
      .replace(/\.(md|canvas)$/, '')
      .split('/')
      .pop();
  return String(text || '')
    .split('\n')
    .map((line) =>
      line
        .replace(/!?\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
        .replace(/!?\[\[([^\]#]*)#\^?([^\]]+)\]\]/g, (match, node, heading) =>
          node ? `${name(node)} › ${heading}` : heading,
        )
        .replace(/!?\[\[([^\]]+)\]\]/g, (match, node) => name(node))
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/^\s*(#{1,6}\s+|>\s*|[-*+]\s+(\[.\]\s+)?|\d+[.)]\s+)/, '')
        .replace(/\*\*|__|~~|==|`/g, '')
        .replace(/(^|\W)[*_](\S[^*_]*?)[*_](?=\W|$)/g, '$1$2')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean);
}

module.exports = plainLines;
