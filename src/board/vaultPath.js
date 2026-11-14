const { ROOT } = require('./constants.js');
const path = require('path');

function vaultPath(relativePath) {
  return path.join(ROOT, relativePath);
}

module.exports = vaultPath;
