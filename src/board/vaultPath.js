const { ROOT } = require('./constants.js');
const path = require('path');

const vaultPath = (relativePath) => path.join(ROOT, relativePath);

module.exports = vaultPath;
