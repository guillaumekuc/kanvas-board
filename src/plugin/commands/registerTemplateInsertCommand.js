const templateFiles = require('../templateFiles.js');
const { Notice } = require('obsidian');
const Picker = require('../Picker.js');
const { TEMPLATE_DIR } = require('../../board/constants.js');

function registerTemplateInsertCommand(plugin) {
  plugin.addCommand({
    id: 'template-insert',
    name: 'Insert cards from template',
    checkCallback: (checking) => {
      const canvas = plugin.activeCanvas();
      if (!canvas) return false;
      if (!checking) {
        const files = templateFiles(plugin);
        if (!files.length) {
          new Notice(
            `Kanvas board: no template in ${TEMPLATE_DIR} (Save selected cards as a template)`,
          );
        } else {
          new Picker(plugin.app, {
            placeholder: 'Template',
            items: files,
            label: (file) => file.basename,
            onChoose: (file) => plugin.insertTemplate(canvas, file),
          }).open();
        }
      }
      return true;
    },
  });
}

module.exports = registerTemplateInsertCommand;
