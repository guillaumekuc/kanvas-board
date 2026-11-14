function registerUnfoldCommands(plugin) {
  for (const [levels, id, name, menu] of [
    [1, 'unfold', 'Unfold branch 1 level', ['Unfold 1 level', 'chevron-down']],
    [2, 'unfold-2', 'Unfold branch 2 levels', null],
    [3, 'unfold-3', 'Unfold branch 3 levels', null],
    [
      Infinity,
      'unfold-all',
      'Unfold whole branch',
      ['Unfold whole branch', 'chevrons-up-down'],
    ],
  ]) {
    plugin.addCanvasCommand(id, name, {
      menu: menu,
      test: (canvas, selection) =>
        selection.some((node) => plugin.unfoldTargets(canvas, node.id).length),
      run: (canvas, selection) =>
        plugin.unfold(
          canvas,
          [
            ...new Set(
              selection.flatMap((node) =>
                plugin.unfoldTargets(canvas, node.id),
              ),
            ),
          ],
          levels,
        ),
    });
  }
}

module.exports = registerUnfoldCommands;
