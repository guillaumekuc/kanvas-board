// Canvas board: color hotkeys for selected canvas cards, and a command that opens a terminal
// running the canvas-board skill (Claude Code) on the vault. See Wiki/G&A/PKM/SOP - Canvas Board.md.
const { Plugin, Notice } = require('obsidian');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLORS = [
	['none (idea or parked)', '', '0'],
	['red (blocked)', '1', '1'],
	['orange (agent working)', '2', '2'],
	['yellow (needs me)', '3', '3'],
	['green (done)', '4', '4'],
	['cyan (go, auto)', '5', '5'],
	['purple (go, plan)', '6', '6'],
];

module.exports = class CanvasBoardPlugin extends Plugin {
	onload() {
		for (const [label, color, key] of COLORS) {
			this.addCommand({
				id: `color-${key}`,
				name: `Color selected cards: ${label}`,
				checkCallback: checking => {
					const canvas = this.activeCanvas();
					if (!canvas || canvas.selection.size === 0) return false;
					if (!checking) {
						for (const node of canvas.selection) node.setColor(color);
						canvas.requestSave();
					}
					return true;
				},
			});
		}

		this.addCommand({
			id: 'run-pass',
			name: 'Run pass (recheck the board)',
			callback: () => this.runPass(),
		});
	}

	activeCanvas() {
		const view = this.app.workspace.activeLeaf && this.app.workspace.activeLeaf.view;
		return view && view.getViewType() === 'canvas' ? view.canvas : null;
	}

	runPass() {
		const vault = this.app.vault.adapter.basePath;
		const local = path.join(process.env.USERPROFILE || '', '.local', 'bin', 'claude.exe');
		const claude = fs.existsSync(local) ? local : 'claude';
		const view = this.app.workspace.activeLeaf && this.app.workspace.activeLeaf.view;
		const board = view && view.getViewType() === 'canvas' && view.file ? view.file.path : 'Plans.canvas';
		try {
			// One named window, one tab per pass: `-w canvas-board` reuses the window or creates it.
			spawn('wt.exe', ['-w', 'canvas-board', 'new-tab', '-d', vault, '--title', `pass ${board}`, claude, `/canvas-board ${board}`], { detached: true, stdio: 'ignore' }).unref();
			new Notice(`Canvas board: pass started on ${board}`);
		} catch (e) {
			new Notice(`Canvas board: could not start the pass (${e.message})`);
		}
	}
};
