const fs = require('fs');
const path = require('path');

// The pass's terminal when the "Terminal command" setting is empty: [command, args], or null (no terminal found).
// Windows Terminal; macOS Terminal.app through AppleScript (paths passed as argv, quoted by the shell);
// on Linux the first known terminal on PATH. `claude` runs in the vault folder with the skill as its prompt.
const onPath = (bin) =>
  String(process.env.PATH || '')
    .split(path.delimiter)
    .some((d) => d && fs.existsSync(path.join(d, bin)));

module.exports = onPath;
