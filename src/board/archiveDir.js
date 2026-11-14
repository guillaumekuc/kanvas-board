const { ARCHIVE_DIR } = require('./constants.js');
const path = require('path');

// Where a board's archive notes go: "<board name> archive" next to the board, or with the setting "Archive" on
// global, one folder for all boards (setting "Archive folder"). `s`: the plugin settings (data.json).
function archiveDir(board, s = {}) {
  if (s.archiveMode === 'global') {
return (
      String(s.archiveFolder || ARCHIVE_DIR)
        .trim()
        .replace(/[/\\]+$/, '') || ARCHIVE_DIR
    );
}
  const b = String(board).replace(/\\/g, '/'),
    dir = path.posix.dirname(b);
  return (
    (dir === '.' ? '' : dir + '/') +
    path.posix.basename(b, '.canvas') +
    ' archive'
  );
}

module.exports = archiveDir;
