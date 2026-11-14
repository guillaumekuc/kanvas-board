const { DEFAULT_NOTES_FOLDER } = require('./constants.js');
const settings = require('./settings.js');

const notesFolder = () => String(settings().notesFolder || DEFAULT_NOTES_FOLDER).replace(/[/]+$/, '') + '/';

module.exports = notesFolder;
