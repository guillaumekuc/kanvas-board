const { OBSIDIAN } = require('./constants.js');
const tryEval = require('./tryEval.js');

const { NOT_INSTALLED } = tryEval;

// Runs `code` in the running Obsidian through its CLI; null when Obsidian is
// not running or the CLI is off.
function obsidianEval(code) {
  for (const binary of OBSIDIAN) {
    const result = tryEval(binary, code);
    if (result !== NOT_INSTALLED) return result;
  }
  return null;
}

module.exports = obsidianEval;
