const { SIDES } = require('./constants.js');
const settings = require('./settings.js');

const defaultDir = () =>
  SIDES[settings().layoutDirection] ? settings().layoutDirection : 'TB';

module.exports = defaultDir;
