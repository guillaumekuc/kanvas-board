const abs = require('./abs.js');
const fileSystem = require('fs');
const path = require('path');

// Next free `<dir>/<name><ext>` (vault-relative), adding " 2", " 3"... when taken.
function freePath(folder, name, ext) {
  for (let attempt = 1; ; attempt++) {
    const candidate = path.posix.join(
      folder,
      `${name}${attempt > 1 ? ' ' + attempt : ''}${ext}`,
    );
    if (!fileSystem.existsSync(abs(candidate))) return candidate;
  }
}

module.exports = freePath;
