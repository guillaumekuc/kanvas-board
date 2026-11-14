const { ORANGE_STALE_MS, WORKING } = require('./constants.js');
const fileSystem = require('fs');
const vaultPath = require('../board/vaultPath.js');

// An orange card whose note nobody touched for a while: a pass that stopped.
function isStaleOrange(node, note) {
  if (node.color !== WORKING) return false;
  const age = Date.now() - fileSystem.statSync(vaultPath(note)).mtimeMs;
  return age > ORANGE_STALE_MS;
}

module.exports = isStaleOrange;
