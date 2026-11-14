function registerBoardCommands(plugin) {
  plugin.addCommand({
    id: 'run-pass',
    name: 'Run pass (recheck the board)',
    callback: () => plugin.runPass(),
  });
  plugin.addCommand({
    id: 'open-board',
    name: 'Open the board',
    callback: () => plugin.openBoard(),
  });
  plugin.addCommand({
    id: 'create-starter-board',
    name: 'Create a starter board (color legend and first cards)',
    callback: () => plugin.createStarterBoard(),
  });
  plugin.addRibbonIcon('kanban-square', 'Open the board (Kanvas board)', () =>
    plugin.openBoard(),
  );
}

module.exports = registerBoardCommands;
