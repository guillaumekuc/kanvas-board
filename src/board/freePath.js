const vaultPath = require('./vaultPath.js');
const fileSystem = require('fs');
const path = require('path');

// Next free `<dir>/<name><ext>` (vault-relative), adding " 2", " 3"... when taken.
function freePath(folder, name, extension) {
  for (let attempt = 1; ; attempt++) {
    const candidate = path.posix.join(
      folder,
      `${name}${attempt > 1 ? ' ' + attempt : ''}${extension}`,
    );
    if (!fileSystem.existsSync(vaultPath(candidate))) return candidate;
  }
}

module.exports = freePath;
