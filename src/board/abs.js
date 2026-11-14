const { ROOT } = require('./constants.js');
const path = require('path');

// --- Board I/O ----------------------------------------------------------------------------------------

const abs = (relativePath) => path.join(ROOT, relativePath);

module.exports = abs;
