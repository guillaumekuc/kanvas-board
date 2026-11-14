const findFile = require('./findFile.js');

function cardLinks(node) {
  const targets =
    node.type === 'file'
      ? [node.file]
      : [
          ...(node.text || '').matchAll(/\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g),
        ].map((match) => findFile(match[1].trim()));
  const found = targets.filter(Boolean);
  return {
    note: found.find((file) => file.endsWith('.md')) || null,
    canvas: found.find((file) => file.endsWith('.canvas')) || null,
  };
}

module.exports = cardLinks;
