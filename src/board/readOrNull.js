const fileSystem = require('fs');
const vaultPath = require('./vaultPath.js');

// A file that vanished or cannot be read counts as absent.
function readOrNull(relativePath) {
  try {
    return fileSystem.readFileSync(vaultPath(relativePath), 'utf8');
  } catch {
    return null;
  }
}

module.exports = readOrNull;
