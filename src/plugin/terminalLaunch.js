const defaultLaunch = require('./defaultLaunch.js');

// [command, arguments] from the "Terminal command" setting, quotes allowed,
// {vault} {board} {claude} filled in; else the platform's default terminal
// (null when none is found).
function terminalLaunch(template, vars) {
  if (!template) return defaultLaunch(vars);
  const words = (template.match(/"[^"]*"|\S+/g) || []).map((word) =>
    word
      .replace(/^"|"$/g, '')
      .replace(/\{(vault|board|claude)\}/g, (match, name) => vars[name]),
  );
  const [command, ...commandArguments] = words;
  return [command, commandArguments];
}

module.exports = terminalLaunch;
