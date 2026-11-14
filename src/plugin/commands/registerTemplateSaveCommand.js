const { Notice } = require('obsidian');
const NamePrompt = require('../NamePrompt.js');
const templateFiles = require('../templateFiles.js');
const templateName = require('../templateName.js');
const { TEMPLATE_DIR } = require('../../board/constants.js');

// Templates: the selection (and edges between its cards) as
// Templates/Canvas/<name>.canvas. Typing the name suggests the existing
// templates: picking one (or typing its name) overwrites it, the button says
// so.
function registerTemplateSaveCommand(plugin) {
  plugin.addCanvasCommand(
    'template-save',
    'Save selected cards as a template',
    {
      menu: ['Save as template', 'layout-template'],
      test: (canvas, selection) => selection.length > 0,
      run: (canvas) => {
        const existing = new Map(
          templateFiles(plugin).map((file) => [
            templateName(file).toLowerCase(),
            file,
          ]),
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
            if (!plugin.app.vault.getAbstractFileByPath(TEMPLATE_DIR)) {
              await plugin.app.vault.createFolder(TEMPLATE_DIR);
            }
            const file = plugin.freePath(TEMPLATE_DIR + '/', name, '.canvas');
            await plugin.app.vault.create(file, content);
            new Notice(`Kanvas board: template saved to ${file}`);
          },
          {
            suggestions: [...existing.values()].map((file) =>
              templateName(file),
            ),
            overwrite: (name) => existing.has(name.toLowerCase()),
          },
        ).open();
      },
    },
  );
}

module.exports = registerTemplateSaveCommand;
