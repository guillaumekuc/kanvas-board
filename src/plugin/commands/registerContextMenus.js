// Right-click on one card, on a selection, or inside a card being edited
// (Extract).
function registerContextMenus(plugin) {
  const { workspace } = plugin.app;
  plugin.registerEvent(
    workspace.on('canvas:selection-menu', (menu, canvas) =>
      plugin.addActionItems(menu, canvas, [...canvas.selection]),
    ),
  );
  plugin.registerEvent(
    workspace.on('canvas:node-menu', (menu, node) => {
      const { selection } = node.canvas;
      const targets = selection.has(node) ? [...selection] : [node];
      plugin.addActionItems(menu, node.canvas, targets);
    }),
  );
  plugin.registerEvent(
    workspace.on('editor-menu', (menu, editor) => {
      const canvas = plugin.activeCanvas();
      const node =
        canvas &&
        [...canvas.selection].find(
          (each) => each.isEditing && plugin.cardEditor(each) === editor,
        );
      if (node) plugin.addActionItems(menu, canvas, [node]);
    }),
  );
}

module.exports = registerContextMenus;
