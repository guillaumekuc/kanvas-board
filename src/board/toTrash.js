const abs = require('./abs.js');
const fileSystem = require('fs');
const path = require('path');

const toTrash = (rel) => {
  const dest = abs(path.posix.join('.trash', path.posix.basename(rel)));
  fileSystem.mkdirSync(path.dirname(dest), { recursive: true });
  fileSystem.renameSync(abs(rel), dest);
};

module.exports = toTrash;
