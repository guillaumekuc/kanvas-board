// The command groups, in the order their right-click items appear.
module.exports = [
  require('./registerColorCommands.js'),
  require('./registerTidyCommands.js'),
  require('./registerPackCommands.js'),
  require('./registerTextCommands.js'),
  require('./registerArchiveCommands.js'),
  require('./registerFoldCommands.js'),
  require('./registerTemplateCommands.js'),
  require('./registerSelectCommands.js'),
  require('./registerViewCommands.js'),
  require('./registerBoardCommands.js'),
  require('./registerContextMenus.js'),
];
