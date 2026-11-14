// Command pattern: each canvas.js command name (and its alias) maps to the
// function that runs it.
module.exports = {
  read: require('./readCommand.js'),
  tree: require('./treeCommand.js'),
  set: require('./setCommand.js'),
  add: require('./addCommand.js'),
  remove: require('./removeCommand.js'),
  edge: require('./edgeCommand.js'),
  layout: require('./layoutCommand.js'),
  pack: require('./packCommand.js'),
  unpack: require('./unpackCommand.js'),
  merge: require('./mergeCommand.js'),
  split: require('./splitCommand.js'),
  extract: require('./extractCommand.js'),
  archive: require('./archiveCommand.js'),
  restore: require('./restoreCommand.js'),
  rollup: require('./rollupCommand.js'),
  check: require('./checkCommand.js'),
  collapse: require('./packCommand.js'),
  expand: require('./unpackCommand.js'),
};
