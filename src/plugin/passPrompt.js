// What the agent is told on a pass: a plain sentence any agent understands,
// pointing at the instructions file in the plugin folder.
function passPrompt(instructionsPath, board) {
  return `Run a Kanvas board pass on ${board}: follow ${instructionsPath}`;
}

module.exports = passPrompt;
