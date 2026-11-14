const vaultPath = require('./vaultPath.js');
const fileSystem = require('fs');
const path = require('path');

const toTrash = (relativePath) => {
  const destination = vaultPath(
    path.posix.join('.trash', path.posix.basename(relativePath)),
  );
  fileSystem.mkdirSync(path.dirname(destination), { recursive: true });
  fileSystem.renameSync(vaultPath(relativePath), destination);
};

module.exports = toTrash;
