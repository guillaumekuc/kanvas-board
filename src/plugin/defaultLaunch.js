const { LINUX_TERMINALS } = require('./constants.js');
const onPath = require('./onPath.js');

// AppleScript run with argv = [vault, ...agent words]: cd to the vault, then
// the agent, every part quoted by the shell.
const MAC_SCRIPT = [
  'on run argv',
  'set agentLine to ""',
  'repeat with wordIndex from 2 to count of argv',
  'set agentLine to agentLine & " " & quoted form of item wordIndex of argv',
  'end repeat',
  'tell application "Terminal"',
  'activate',
  'do script "cd " & quoted form of item 1 of argv & " &&" & agentLine',
  'end tell',
  'end run',
];

function defaultLaunch({ vault, board, agent }) {
  if (process.platform === 'win32') {
    return [
      'wt.exe',
      [
        '-w',
        'kanvas-board',
        'new-tab',
        '-d',
        vault,
        '--title',
        `pass ${board}`,
        ...agent,
      ],
    ];
  }
  if (process.platform === 'darwin') {
    const script = MAC_SCRIPT.flatMap((line) => ['-e', line]);
    return ['osascript', [...script, vault, ...agent]];
  }
  const found = LINUX_TERMINALS.find(([binary]) => onPath(binary));
  return found ? [found[0], found[1](vault, agent)] : null;
}

module.exports = defaultLaunch;
