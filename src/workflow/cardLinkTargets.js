const WIKILINK = /\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g;

// What a card links: its file, or the targets of the wikilinks in its text.
function cardLinkTargets(node) {
  if (node.type === 'file') return [node.file];
  return [...(node.text || '').matchAll(WIKILINK)].map((match) =>
    match[1].trim(),
  );
}

module.exports = cardLinkTargets;
