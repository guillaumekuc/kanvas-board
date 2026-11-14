// Height that fits a text card's markdown at Obsidian's default canvas font (~8px a char, 26px a line).
function fitHeight(text, width) {
  const perLine = Math.max(10, Math.floor((width - 40) / 8));
  const lines = String(text || '')
    .split('\n')
    .reduce(
      (lines, line) =>
        lines +
        Math.max(
          1,
          Math.ceil(
            line.replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2').length /
              perLine,
          ),
        ),
      0,
    );
  return Math.max(60, lines * 26 + 34);
}

module.exports = fitHeight;
