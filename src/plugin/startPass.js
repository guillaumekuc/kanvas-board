const { Notice } = require('obsidian');
const { spawn } = require('child_process');

// The terminal runs on its own: closing Obsidian does not stop the pass.
function startPass([command, commandArguments], { vault, board }) {
  function failed(error) {
    return new Notice(
      `Kanvas board: could not start the pass (${error.message})`,
    );
  }
  try {
    const child = spawn(command, commandArguments, {
      cwd: vault,
      detached: true,
      stdio: 'ignore',
    });
    child.on('error', failed);
    child.unref();
    new Notice(`Kanvas board: pass started on ${board}`);
  } catch (error) {
    failed(error);
  }
}

module.exports = startPass;
