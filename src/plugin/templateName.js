const { TEMPLATE_DIR } = require('../board/constants.js');

// The path under the template folder, subfolders kept, without .canvas.
function templateName(file) {
  return file.path.slice(TEMPLATE_DIR.length + 1, -'.canvas'.length);
}

module.exports = templateName;
