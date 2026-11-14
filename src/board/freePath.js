const abs = require('./abs.js');
const fs = require('fs');
const path = require('path');

// Next free `<dir>/<name><ext>` (vault-relative), adding " 2", " 3"... when taken.
function freePath(dir, name, ext) {
  for (let k = 1; ; k++) {
    const p = path.posix.join(dir, `${name}${k > 1 ? ' ' + k : ''}${ext}`);
    if (!fs.existsSync(abs(p))) return p;
  }
}

module.exports = freePath;
