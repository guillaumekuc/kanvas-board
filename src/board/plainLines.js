

// Card text without Markdown syntax, one string per non-empty line, for lists (filter pane):
// [[Note|alias]] → alias, [[Note#Heading]] → Note › Heading, [[Note]] → Note, [text](url) → text; marks
// (** __ ~~ == ` * _), heading, quote, list and checkbox markers dropped; #tags kept.
function plainLines(text) {
  const name = n => n.replace(/\.(md|canvas)$/, '').split('/').pop();
  return String(text || '').split('\n').map(l => l
    .replace(/!?\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/!?\[\[([^\]#]*)#\^?([^\]]+)\]\]/g, (_, n, h) => n ? `${name(n)} › ${h}` : h)
    .replace(/!?\[\[([^\]]+)\]\]/g, (_, n) => name(n))
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(#{1,6}\s+|>\s*|[-*+]\s+(\[.\]\s+)?|\d+[.)]\s+)/, '')
    .replace(/\*\*|__|~~|==|`/g, '')
    .replace(/(^|\W)[*_](\S[^*_]*?)[*_](?=\W|$)/g, '$1$2')
    .replace(/\s+/g, ' ').trim()).filter(Boolean);
}

module.exports = plainLines;
