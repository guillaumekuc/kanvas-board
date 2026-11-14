const defaultLaunch = require('./defaultLaunch.js');

// [command, arguments] from the "Terminal command" setting, quotes allowed,
// {vault} {board} filled in and a {agent} word (old name {claude}) replaced by
// the agent command with its prompt; else the platform's default terminal
// (null when none is found).
function terminalLaunch(template, { vault, board, agent }) {
  if (!template) return defaultLaunch({ vault, board, agent });
  const values = { vault, board };
  const words = (template.match(/"[^"]*"|\S+/g) || []).flatMap((word) => {
    const bare = word.replace(/^"|"$/g, '');
    if (bare === '{agent}' || bare === '{claude}') return agent;
    return [bare.replace(/\{(vault|board)\}/g, (match, name) => values[name])];
  });
  const [command, ...commandArguments] = words;
  return [command, commandArguments];
}

module.exports = terminalLaunch;
