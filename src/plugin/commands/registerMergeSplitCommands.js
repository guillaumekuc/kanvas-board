const isTextNode = require('../isTextNode.js');

function registerMergeSplitCommands(plugin) {
  plugin.addCanvasCommand('merge', 'Merge selected cards', {
    menu: ['Merge cards', 'merge'],
    test: (canvas, selection) =>
      selection.length > 1 && selection.every(isTextNode),
    run: (canvas, selection) =>
      plugin.edit(
        canvas,
        plugin.boardLibrary.mergeOps(
          canvas.getData(),
          selection.map((node) => node.id),
        ),
      ),
  });

  // Only the top-level split is a menu item; the others stay commands.
  for (const [separator, label] of [
    ['paragraph', 'paragraph'],
    ['bullet', 'top-level bullet'],
    ['h1', 'heading 1'],
    ['h2', 'heading 2'],
    ['h3', 'heading 3'],
  ]) {
    plugin.addCanvasCommand(`split-${separator}`, `Split card by ${label}`, {
      menu:
        separator === 'bullet' ? ['Split by top-level bullet', 'split'] : null,
      test: (canvas, selection) =>
        selection.length === 1 &&
        isTextNode(selection[0]) &&
        !selection[0].isEditing,
      run: (canvas, [node]) =>
        plugin.edit(
          canvas,
          plugin.boardLibrary.splitOps(canvas.getData(), node.id, separator),
        ),
    });
  }
}

module.exports = registerMergeSplitCommands;
