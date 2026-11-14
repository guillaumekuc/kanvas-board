const fileSystem = require('fs');
const path = require('path');

// The pass's terminal when the "Terminal command" setting is empty: [command,
// args], or null (no terminal found). Windows Terminal; macOS Terminal.app
// through AppleScript (paths passed as argv, quoted by the shell); on Linux the
// first known terminal on PATH. The agent runs in the vault folder with the
// pass prompt.
function onPath(binary) {
  return String(process.env.PATH || '')
    .split(path.delimiter)
    .some(
      (folder) => folder && fileSystem.existsSync(path.join(folder, binary)),
    );
}

module.exports = onPath;
