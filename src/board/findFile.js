const vaultFileIndex = require('./vaultFileIndex.js');

function findFile(name) {
  return vaultFileIndex.get(name);
}

module.exports = findFile;
