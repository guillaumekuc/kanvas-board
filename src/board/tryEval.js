const { execFileSync } = require('child_process');

const NOT_INSTALLED = 'ENOENT';

// Tries one install path of the CLI: NOT_INSTALLED when it is not there.
function tryEval(binary, code) {
  try {
    const out = execFileSync(binary, ['eval', `code=${code}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const match = out.match(/=>\s?([\s\S]*)$/);
    if (!match) throw new Error(out.trim());
    return match[1].trim();
  } catch (error) {
    return error.code === 'ENOENT' ? NOT_INSTALLED : null;
  }
}

module.exports = tryEval;
module.exports.NOT_INSTALLED = NOT_INSTALLED;
