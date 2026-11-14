const path = require('path');

// The default board when it does not exist yet, else "Starter board.canvas"
// next to it (numbered when taken).
function starterBoardPath(vault, defaultBoard) {
  if (!vault.getAbstractFileByPath(defaultBoard)) return defaultBoard;
  const parent = path.posix.dirname(defaultBoard);
  const folder = parent === '.' ? '' : `${parent}/`;
  for (let suffix = 1; ; suffix++) {
    const board = `${folder}Starter board${suffix > 1 ? ` ${suffix}` : ''}.canvas`;
    if (!vault.getAbstractFileByPath(board)) return board;
  }
}

module.exports = starterBoardPath;
