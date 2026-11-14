const findFile = require('./findFile.js');

function cardLinks(n) {
  const targets =
    n.type === 'file'
      ? [n.file]
      : [...(n.text || '').matchAll(/\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g)].map(
          (m) => findFile(m[1].trim()),
        );
  const found = targets.filter(Boolean);
  return {
    note: found.find((f) => f.endsWith('.md')) || null,
    canvas: found.find((f) => f.endsWith('.canvas')) || null,
  };
}

module.exports = cardLinks;
