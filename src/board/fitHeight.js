// Height that fits a text card's markdown at Obsidian's default canvas font (~8px a char, 26px a line).
function fitHeight(text, w) {
  const perLine = Math.max(10, Math.floor((w - 40) / 8));
  const lines = String(text || '')
    .split('\n')
    .reduce(
      (s, l) =>
        s +
        Math.max(
          1,
          Math.ceil(
            l.replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2').length / perLine,
          ),
        ),
      0,
    );
  return Math.max(60, lines * 26 + 34);
}

module.exports = fitHeight;
