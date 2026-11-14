// by: paragraph (blank lines), bullet (top-level list items), h1..h6 (a new piece at each heading of that level).
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
          if (starts.test(line) || !pieces.length) pieces.push([]);
          pieces[pieces.length - 1].push(line);
          return pieces;
        }, [])
        .map((pieceLines) => pieceLines.join('\n'))
    : text.split(/\n\s*\n/);
  return pieces.map((piece) => piece.trim()).filter(Boolean);
}

module.exports = splitText;
