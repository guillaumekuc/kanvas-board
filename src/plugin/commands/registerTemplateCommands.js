const { Notice } = require('obsidian');
const NamePrompt = require('../NamePrompt.js');
const Picker = require('../Picker.js');

function registerTemplateCommands(plugin) {
  // Templates: the selection (and edges between its cards) as Templates/Canvas/<name>.canvas. Typing the name
  // suggests the existing templates: picking one (or typing its name) overwrites it, the button says so.
  const templates = () =>
    plugin.app.vault
      .getFiles()
      .filter(
        (file) =>
          file.extension === 'canvas' &&
          file.path.startsWith(plugin.boardLibrary.TEMPLATE_DIR + '/'),
      );
  const templateName = (file) =>
    file.path.slice(
      plugin.boardLibrary.TEMPLATE_DIR.length + 1,
      -'.canvas'.length,
    ); // subfolders kept
  plugin.addCanvasCommand(
    'template-save',
    'Save selected cards as a template',
    {
      menu: ['Save as template', 'layout-template'],
      test: (canvas, selection) => selection.length > 0,
      run: (canvas) => {
        const existing = new Map(
          templates().map((file) => [templateName(file).toLowerCase(), file]),
        );
        new NamePrompt(
          plugin.app,
          'Template name',
          async (name) => {
            const content = JSON.stringify(
              (({ nodes, edges }) => ({ nodes, edges }))(
                canvas.getSelectionData(),
              ),
              null,
              '\t',
            );
            const old = existing.get(name.toLowerCase());
            if (old) {
              await plugin.app.vault.modify(old, content);
              new Notice(`Kanvas board: template ${old.path} overwritten`);
              return;
            }
            if (
              !plugin.app.vault.getAbstractFileByPath(
                plugin.boardLibrary.TEMPLATE_DIR,
              )
            ) {
              await plugin.app.vault.createFolder(
                plugin.boardLibrary.TEMPLATE_DIR,
              );
            }
            const file = plugin.freePath(
              plugin.boardLibrary.TEMPLATE_DIR + '/',
              name,
              '.canvas',
            );
            await plugin.app.vault.create(file, content);
            new Notice(`Kanvas board: template saved to ${file}`);
          },
          {
            suggestions: [...existing.values()].map(templateName),
            overwrite: (name) => existing.has(name.toLowerCase()),
          },
        ).open();
      },
    },
  );

  plugin.addCommand({
    id: 'template-insert',
    name: 'Insert cards from template',
    checkCallback: (checking) => {
      const canvas = plugin.activeCanvas();
      if (!canvas) return false;
      if (!checking) {
        const files = plugin.app.vault
          .getFiles()
          .filter(
            (file) =>
              file.extension === 'canvas' &&
              file.path.startsWith(plugin.boardLibrary.TEMPLATE_DIR + '/'),
          );
        if (!files.length) {
          new Notice(
            `Kanvas board: no template in ${plugin.boardLibrary.TEMPLATE_DIR} (Save selected cards as a template)`,
          );
        } else {
          new Picker(
            plugin.app,
            'Template',
            files,
            (file) => file.basename,
            (file) => plugin.insertTemplate(canvas, file),
          ).open();
        }
      }
      return true;
    },
  });
}

module.exports = registerTemplateCommands;
