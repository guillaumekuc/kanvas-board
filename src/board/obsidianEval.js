const { execFileSync } = require('child_process');
const { OBSIDIAN } = require('./constants.js');

function obsidianEval(code) {
  for (const bin of OBSIDIAN) {
    try {
      const out = execFileSync(bin, ['eval', `code=${code}`], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const match = out.match(/=>\s?([\s\S]*)$/);
      if (!match) throw new Error(out.trim());
      return match[1].trim();
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      return null; // Obsidian not running, or the CLI is off
    }
  }
  return null;
}

module.exports = obsidianEval;
