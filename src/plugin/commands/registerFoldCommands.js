const { Notice } = require('obsidian');

function registerFoldCommands(plugin) {
  // Fold hides the cards linked to a card, following edges in the "Fold direction" setting (out: the cards it
  // points to, then on; in: the cards pointing to it, then on). Unfold shows N levels again and folds the cards
  // at level N, so a branch opens in stages, like folders. Folds are stored on the card (see foldOf), so Ctrl+Z
  // undoes them. With several cards selected, each one that can be folded (or unfolded) is.
  const canFold = (canvas, node) =>
    !plugin.foldOf(node) &&
    plugin.branchLinks(canvas, plugin.settings.foldDirection).has(node.id);
  plugin.addCanvasCommand('fold', 'Fold branch', {
    menu: ['Fold branch', 'chevrons-down-up'],
    test: (canvas, selection) =>
      selection.some((node) => canFold(canvas, node)),
    run: (canvas, selection) =>
      plugin.setFolds(
        canvas,
        new Map(
          selection
            .filter((node) => canFold(canvas, node))
            .map((node) => [node.id, plugin.settings.foldDirection]),
        ),
      ),
  });
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
  for (const [direction, label] of [
    ['out', 'outgoing (cards it points to)'],
    ['in', 'incoming (cards pointing to it)'],
  ]) {
    plugin.addCommand({
      id: `fold-direction-${direction}`,
      name: `Fold direction: ${label}`,
      checkCallback: (checking) => {
        if (plugin.settings.foldDirection === direction) return false;
        if (!checking) {
          plugin.settings.foldDirection = direction;
          plugin.saveData(plugin.settings);
          new Notice(`Kanvas board: fold direction ${label}`);
        }
        return true;
      },
    });
  }
}

module.exports = registerFoldCommands;
