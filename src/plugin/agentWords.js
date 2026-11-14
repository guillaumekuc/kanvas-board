const claudeBin = require('./claudeBin.js');

// The pass's agent as [command, ...arguments]: the "Agent command" setting
// (quoted parts stay one word, {prompt} is replaced, else the prompt goes
// last), or Claude Code when the setting is empty.
function agentWords(setting, prompt) {
  const template = String(setting || '').trim();
  if (!template) return [claudeBin(''), prompt];
  const words = (template.match(/"[^"]*"|\S+/g) || []).map((word) =>
    word.replace(/^"|"$/g, ''),
  );
  const hasPrompt = words.some((word) => word.includes('{prompt}'));
  const filled = words.map((word) => word.replace(/\{prompt\}/g, prompt));
  return hasPrompt ? filled : [...filled, prompt];
}

module.exports = agentWords;
