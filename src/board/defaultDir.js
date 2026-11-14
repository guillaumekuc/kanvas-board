const { SIDES } = require('./constants.js');
const settings = require('./settings.js');

function defaultDir() {
  return SIDES[settings().layoutDirection] ? settings().layoutDirection : 'TB';
}

module.exports = defaultDir;
