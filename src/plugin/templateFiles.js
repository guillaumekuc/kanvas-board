const { TEMPLATE_DIR } = require('../board/constants.js');

function templateFiles(plugin) {
  return plugin.app.vault
    .getFiles()
    .filter(
      (file) =>
        file.extension === 'canvas' && file.path.startsWith(TEMPLATE_DIR + '/'),
    );
}

module.exports = templateFiles;
