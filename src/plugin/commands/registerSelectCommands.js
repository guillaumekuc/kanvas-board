function registerSelectCommands(plugin) {
  // Selection tools: the selection grows to related cards (visible ones only: hidden cards never stay selected).
  // Children: every level down, in the fold direction. The selected cards stay selected.
  const cards = (selection) =>
    selection.filter((node) => !node.from && node.getData().type !== 'group');
  const selectMore = (plugin.selectMore = (canvas, selection, keep) => {
    const add = [...canvas.nodes.values()].filter(
      (node) =>
        node.getData().type !== 'group' &&
        !plugin.isHidden(canvas, node) &&
        keep(node),
    );
    canvas.updateSelection(() => {
      canvas.selection.clear();
      for (const node of [...selection, ...add]) canvas.selection.add(node);
    });
    return add.length;
  });
  const childIds = (canvas, selection) =>
    new Set(
      cards(selection).flatMap((node) =>
        plugin
          .branchLevels(canvas, node.id, plugin.settings.foldDirection)
          .flat(),
      ),
    );
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
        selectMore(canvas, selection, (node) => ids.has(node.id));
      },
    },
  );
  const tagsOf = (selection) =>
    new Set(cards(selection).flatMap((node) => [...plugin.cardTagSet(node)]));
  plugin.addCanvasCommand('select-same-tag', 'Select cards with the same tag', {
    menu: ['Select same tag', 'tag'],
    test: (canvas, selection) => tagsOf(selection).size > 0,
    run: (canvas, selection) => {
      const tags = tagsOf(selection);
      selectMore(canvas, selection, (node) =>
        [...plugin.cardTagSet(node)].some((tag) => tags.has(tag)),
      );
    },
  });
  plugin.addCanvasCommand(
    'select-same-color',
    'Select cards with the same color',
    {
      menu: ['Select same color', 'palette'],
      test: (canvas, selection) => cards(selection).length > 0,
      run: (canvas, selection) => {
        const colors = new Set(
          cards(selection).map((node) => node.getData().color || ''),
        );
        selectMore(canvas, selection, (node) =>
          colors.has(node.getData().color || ''),
        );
      },
    },
  );
}

module.exports = registerSelectCommands;
