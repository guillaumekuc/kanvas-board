const { ROOT } = require('./constants.js');
const path = require('path');

// --- Board I/O ----------------------------------------------------------------------------------------

const vaultPath = (relativePath) => path.join(ROOT, relativePath);

module.exports = vaultPath;
