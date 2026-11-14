const selectedCards = require('../selectedCards.js');

// Selection tools grow the selection to related cards. Children: every level
// down, in the fold direction.
function registerSelectChildrenCommand(plugin) {
  function childIds(canvas, selection) {
    return new Set(
      selectedCards(selection).flatMap((node) =>
        plugin
          .branchLevels(canvas, node.id, plugin.settings.foldDirection)
          .flat(),
      ),
    );
  }
  plugin.addCanvasCommand(
    'select-children',
    'Select children (all levels down, in the fold direction)',
    {
      menu: ['Select children', 'list-tree'],
      test: (canvas, selection) =>
        [...childIds(canvas, selection)].some(
          (id) =>
            canvas.nodes.get(id) &&
            !plugin.isHidden(canvas, canvas.nodes.get(id)) &&
            !canvas.selection.has(canvas.nodes.get(id)),
        ),
      run: (canvas, selection) => {
        const ids = childIds(canvas, selection);
        plugin.selectMore(canvas, selection, (node) => ids.has(node.id));
      },
    },
  );
}

module.exports = registerSelectChildrenCommand;
