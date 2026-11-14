const fs = require('fs');
const os = require('os');
const path = require('path');

// Claude Code: the setting, else the native installer's ~/.local/bin/claude(.exe), else `claude` on PATH.
function claudeBin(setting) {
	if (setting) return setting;
	const local = path.join(os.homedir(), '.local', 'bin', process.platform === 'win32' ? 'claude.exe' : 'claude');
	return fs.existsSync(local) ? local : 'claude';
}

module.exports = claudeBin;
