const { LINUX_TERMINALS } = require('./constants.js');
const onPath = require('./onPath.js');

function defaultLaunch({ vault, board, claude }) {
	const prompt = `/canvas-board ${board}`;
	if (process.platform === 'win32') return ['wt.exe', ['-w', 'canvas-board', 'new-tab', '-d', vault, '--title', `pass ${board}`, claude, prompt]];
	if (process.platform === 'darwin') return ['osascript', [
		'-e', 'on run argv',
		'-e', 'tell application "Terminal"',
		'-e', 'activate',
		'-e', 'do script "cd " & quoted form of item 1 of argv & " && " & quoted form of item 2 of argv & " " & quoted form of item 3 of argv',
		'-e', 'end tell',
		'-e', 'end run',
		vault, claude, prompt,
	]];
	const found = LINUX_TERMINALS.find(([bin]) => onPath(bin));
	return found ? [found[0], found[1](vault, [claude, prompt])] : null;
}

module.exports = defaultLaunch;
