const { ARCHIVE_DIR } = require('./constants.js');
const path = require('path');

// Where a board's archive notes go: "<board name> archive" next to the board, or with the setting "Archive" on
// global, one folder for all boards (setting "Archive folder"). `s`: the plugin settings (data.json).
function archiveDir(board, options = {}) {
  if (options.archiveMode === 'global') {
    return (
      String(options.archiveFolder || ARCHIVE_DIR)
        .trim()
        .replace(/[/\\]+$/, '') || ARCHIVE_DIR
    );
  }
  const boardPath = String(board).replace(/\\/g, '/'),
    folder = path.posix.dirname(boardPath);
  return (
    (folder === '.' ? '' : folder + '/') +
    path.posix.basename(boardPath, '.canvas') +
    ' archive'
  );
}

module.exports = archiveDir;
