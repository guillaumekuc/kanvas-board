const isTextNode = require('../isTextNode.js');

function registerTextCommands(plugin) {
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

  // The card being edited, with text selected: the selection becomes a new card.
  plugin.addCanvasCommand(
    'extract',
    'Extract current selection to a new card',
    {
      menu: ['Extract current selection to a new card', 'text-select'],
      test: (canvas, selection) =>
        selection.length === 1 &&
        selection[0].isEditing &&
        !!plugin.cardEditor(selection[0]),
      run: (canvas, [node]) => {
        const editor = plugin.cardEditor(node);
        const part = editor.getSelection();
        if (!part.trim()) throw new Error('select some text in the card first');
        const from = editor.posToOffset(editor.getCursor('from'));
        const before = editor.getValue();
        editor.replaceSelection('');
        node.blur();
        const canvasData = canvas.getData();
        const savedNode = canvasData.nodes.find((x) => x.id === node.id);
        if (savedNode) savedNode.text = before; // the editor may not have saved yet: work from what it showed
        plugin.edit(
          canvas,
          plugin.boardLibrary.extractOps(canvasData, {
            id: node.id,
            part,
            from,
          }),
          canvasData,
        );
      },
    },
  );
}

module.exports = registerTextCommands;
