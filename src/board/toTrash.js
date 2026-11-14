const abs = require('./abs.js');
const fs = require('fs');
const path = require('path');

const toTrash = (rel) => {
  const dest = abs(path.posix.join('.trash', path.posix.basename(rel)));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(abs(rel), dest);
};

module.exports = toTrash;
