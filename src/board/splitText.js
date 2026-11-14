// by: paragraph (blank lines), bullet (top-level list items), h1..h6 (a new piece at each heading of that level).
function splitText(text, by) {
  const h = /^h([1-6])$/.exec(by);
  const starts = h
    ? new RegExp(`^#{${h[1]}} `)
    : by === 'bullet'
      ? /^([-*+]|\d+[.)]) /
      : null;
  const pieces = starts
    ? text
        .split('\n')
        .reduce((acc, line) => {
          if (starts.test(line) || !acc.length) acc.push([]);
          acc[acc.length - 1].push(line);
          return acc;
        }, [])
        .map((l) => l.join('\n'))
    : text.split(/\n\s*\n/);
  return pieces.map((p) => p.trim()).filter(Boolean);
}

module.exports = splitText;
