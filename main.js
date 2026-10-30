// Canvas board: color hotkeys for selected canvas cards, a command that opens a terminal running the
// canvas-board skill (Claude Code) on the vault, and an API that canvas.js calls (through `obsidian eval`)
// to edit open boards, a "Tidy layout" command (dagre, through canvas.js) and a status bar card count. Copies skill/SKILL.md to
// .claude/skills/canvas-board/ on load.
// See Wiki/G&A/PKM/SOP - Canvas Board.md.
const { Plugin, Notice, PluginSettingTab, Setting } = require('obsidian');
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

// {vault} {board} {claude} are replaced; quoted parts stay one argument.
const DEFAULTS = {
	defaultBoard: 'Plans.canvas',
	claudePath: '',
	layoutDirection: 'TB',
	cardWarning: '60',
	terminal: 'wt.exe -w canvas-board new-tab -d "{vault}" --title "pass {board}" "{claude}" "/canvas-board {board}"',
};

module.exports = class CanvasBoardPlugin extends Plugin {
	async onload() {
		this.settings = Object.assign({}, DEFAULTS, await this.loadData());
		this.addSettingTab(new CanvasBoardSettings(this.app, this));
		const dir = path.join(this.app.vault.adapter.basePath, this.manifest.dir);
		const script = path.join(dir, 'canvas.js');
		const req = window.require || require; // the plugin's own require has no cache to clear on reload
		if (req.cache) delete req.cache[script];
		const { applyOps, layoutOps } = req(script);
		const dagrePath = path.join(dir, 'dagre.min.js');
		if (req.cache) delete req.cache[dagrePath];
		const dagre = req(dagrePath);
		this.api = {
			read: board => {
				const canvas = this.openCanvas(board);
				return canvas ? JSON.stringify(canvas.getData()) : null;
			},
			// Changing a card's type needs setData() without the card, then with it, to keep its id.
			apply: async (board, ops) => {
				const canvas = this.openCanvas(board);
				if (!canvas) return null;
				const d = canvas.getData();
				const retyped = applyOps(d, ops);
				if (retyped.length) canvas.setData({ ...d, nodes: d.nodes.filter(n => !retyped.includes(n.id)) });
				canvas.setData(d);
				canvas.requestSave();
				await new Promise(r => setTimeout(r, 2500));
				return 'obsidian';
			},
		};
		this.syncSkill(dir);

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

		// Selected cards only when 2+ are selected (the rest never moves), else the whole canvas. Ctrl+Z undoes it.
		this.addCommand({
			id: 'tidy-layout',
			name: 'Tidy layout (selected cards, or the whole canvas)',
			checkCallback: checking => {
				const canvas = this.activeCanvas();
				if (!canvas) return false;
				if (!checking) {
					const ids = canvas.selection.size > 1 ? [...canvas.selection].map(n => n.id) : [];
					const d = canvas.getData();
					applyOps(d, layoutOps(d, { ids, dir: this.settings.layoutDirection, dagre }));
					canvas.pushHistory && canvas.pushHistory(canvas.getData());
					canvas.setData(d);
					canvas.requestSave();
				}
				return true;
			},
		});

		this.addCommand({
			id: 'run-pass',
			name: 'Run pass (recheck the board)',
			callback: () => this.runPass(),
		});

		// Card count of the active canvas in the status bar: boards get hard to manage past a threshold.
		this.countEl = this.addStatusBarItem();
		this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.updateCount()));
		this.registerInterval(window.setInterval(() => this.updateCount(), 2000));
		this.updateCount();
	}

	updateCount() {
		const canvas = this.activeCanvas();
		if (!canvas) { this.countEl.setText(''); this.countEl.hide(); return; }
		const cards = [...canvas.nodes.values()].map(n => n.getData()).filter(n => n.type !== 'group');
		const names = { '': 'none', 1: 'red', 2: 'orange', 3: 'yellow', 4: 'green', 5: 'cyan', 6: 'purple' };
		const byColor = {};
		for (const n of cards) { const c = names[n.color || ''] || 'custom'; byColor[c] = (byColor[c] || 0) + 1; }
		const max = Number(this.settings.cardWarning) || 0;
		this.countEl.setText(`${cards.length} cards${max && cards.length > max ? ` (over ${max})` : ''}`);
		this.countEl.setAttr('aria-label', Object.entries(byColor).map(([c, k]) => `${c} ${k}`).join(' · '));
		this.countEl.setAttr('data-tooltip-position', 'top');
		this.countEl.show();
	}

	// The plugin folder holds the skill's source; the vault copy is rewritten when missing or older.
	syncSkill(dir) {
		const src = path.join(dir, 'skill', 'SKILL.md');
		const dest = path.join(this.app.vault.adapter.basePath, '.claude', 'skills', 'canvas-board', 'SKILL.md');
		try {
			if (fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(src).mtimeMs) return;
			fs.mkdirSync(path.dirname(dest), { recursive: true });
			fs.copyFileSync(src, dest);
		} catch (e) {
			console.error('canvas-board: skill sync failed', e);
		}
	}

	openCanvas(board) {
		const leaf = this.app.workspace.getLeavesOfType('canvas').find(l => l.view.file && l.view.file.path === board);
		return leaf ? leaf.view.canvas : null;
	}

	activeCanvas() {
		const view = this.app.workspace.activeLeaf && this.app.workspace.activeLeaf.view;
		return view && view.getViewType() === 'canvas' ? view.canvas : null;
	}

	// True if the board, or a plan canvas linked from one of its cards, has a cyan or purple card.
	async hasGoCards(board) {
		const read = async p => {
			const file = this.app.vault.getAbstractFileByPath(p);
			if (!file) return [];
			try { return JSON.parse(await this.app.vault.cachedRead(file)).nodes || []; } catch (e) { return []; }
		};
		const isGo = n => n.color === '5' || n.color === '6';
		const open = this.openCanvas(board);
		const nodes = open ? open.getData().nodes : await read(board);
		if (nodes.some(isGo)) return true;
		for (const n of nodes) {
			for (const m of (n.text || '').matchAll(/\[\[([^\]|#]+\.canvas)/g)) {
				const dest = this.app.metadataCache.getFirstLinkpathDest(m[1].trim(), board);
				if (dest && (await read(dest.path)).some(isGo)) return true;
			}
		}
		return false;
	}

	async runPass() {
		const vault = this.app.vault.adapter.basePath;
		const local = path.join(process.env.USERPROFILE || '', '.local', 'bin', 'claude.exe');
		const claude = this.settings.claudePath || (fs.existsSync(local) ? local : 'claude');
		const view = this.app.workspace.activeLeaf && this.app.workspace.activeLeaf.view;
		const board = view && view.getViewType() === 'canvas' && view.file ? view.file.path : this.settings.defaultBoard;
		if (!(await this.hasGoCards(board))) {
			new Notice(`Canvas board: nothing to do on ${board} (no cyan or purple card)`);
			return;
		}
		const vars = { vault, board, claude };
		const [cmd, ...cmdArgs] = (this.settings.terminal.match(/"[^"]*"|\S+/g) || [])
			.map(a => a.replace(/^"|"$/g, '').replace(/\{(vault|board|claude)\}/g, (_, k) => vars[k]));
		try {
			const child = spawn(cmd, cmdArgs, { detached: true, stdio: 'ignore' });
			child.on('error', e => new Notice(`Canvas board: could not start the pass (${e.message})`));
			child.unref();
			new Notice(`Canvas board: pass started on ${board}`);
		} catch (e) {
			new Notice(`Canvas board: could not start the pass (${e.message})`);
		}
	}
};

class CanvasBoardSettings extends PluginSettingTab {
	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();
		const text = (name, desc, key) => new Setting(containerEl).setName(name).setDesc(desc).addText(t => t
			.setPlaceholder(DEFAULTS[key])
			.setValue(this.plugin.settings[key])
			.onChange(async v => { this.plugin.settings[key] = v.trim() || DEFAULTS[key]; await this.plugin.saveData(this.plugin.settings); }));
		text('Default board', 'Board used by "Run pass" when the active tab is not a canvas.', 'defaultBoard');
		text('Claude path', 'Empty: ~/.local/bin/claude.exe if it exists, else claude on PATH.', 'claudePath');
		new Setting(containerEl).setName('Layout direction').setDesc('Tidy layout and agent-made plan canvases: top to bottom or left to right ("depends on" prerequisites come first).').addDropdown(dd => dd
			.addOptions({ TB: 'Top to bottom', LR: 'Left to right' })
			.setValue(this.plugin.settings.layoutDirection)
			.onChange(async v => { this.plugin.settings.layoutDirection = v; await this.plugin.saveData(this.plugin.settings); }));
		text('Card count warning', 'The status bar card count says "over N" past this many cards (0: never).', 'cardWarning');
		text('Terminal command', 'Starts the pass. {vault}, {board}, {claude} are replaced; quote parts with spaces.', 'terminal');
	}
}
