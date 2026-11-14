const { DEFAULT_NOTES_FOLDER } = require('./constants.js');
const settings = require('./settings.js');

function notesFolder() {
  return (
    String(settings().notesFolder || DEFAULT_NOTES_FOLDER).replace(
      /[/]+$/,
      '',
    ) + '/'
  );
}

module.exports = notesFolder;
