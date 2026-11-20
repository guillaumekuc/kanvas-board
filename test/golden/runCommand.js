const path = require('path');

const ERROR_LINE = /^(\w*Error|Usage)/;
const { spawnSync } = require('child_process');

// Runs canvas.js offline and deterministic (see preload.js); keeps only the
// error lines of stderr, since stack traces carry temporary paths.
function runCommand(vaultRoot, commandArguments) {
  const script = path.join(
    vaultRoot,
    '.obsidian',
    'plugins',
    'kanvas-board',
    'canvas.js',
  );
  const preload = path.join(__dirname, 'preload.js');
  const result = spawnSync(
    process.execPath,
    ['-r', preload, script, ...commandArguments],
    { cwd: vaultRoot, encoding: 'utf8' },
  );
  const errors = result.stderr
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => ERROR_LINE.test(line));
  return {
    args: commandArguments.join(' '),
    status: result.status,
    stdout: result.stdout,
    errors,
  };
}

module.exports = runCommand;
