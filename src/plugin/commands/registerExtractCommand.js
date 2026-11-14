function registerExtractCommand(plugin) {
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

module.exports = registerExtractCommand;
