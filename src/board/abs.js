const { ROOT } = require('./constants.js');
const path = require('path');

// --- Board I/O ----------------------------------------------------------------------------------------

const abs = p => path.join(ROOT, p);

module.exports = abs;
