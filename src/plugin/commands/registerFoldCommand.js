// Fold hides the cards linked to a card, following edges in the "Fold
// direction" setting (out: the cards it points to, then on; in: the cards
// pointing to it, then on). Unfold shows N levels again and folds the cards
// at level N, so a branch opens in stages, like folders. Folds are stored on
// the card (see foldOf), so Ctrl+Z undoes them. With several cards selected,
// each one that can be folded (or unfolded) is.
function registerFoldCommand(plugin) {
  function canFold(canvas, node) {
    return (
      !plugin.foldOf(node) &&
      plugin.branchLinks(canvas, plugin.settings.foldDirection).has(node.id)
    );
  }
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
}

module.exports = registerFoldCommand;
