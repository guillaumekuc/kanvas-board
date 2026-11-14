// Canvas board: color hotkeys for selected canvas cards, a command that opens a terminal running the
// canvas-board skill (Claude Code) on the vault, and an API that canvas.js calls (through `obsidian eval`)
// to edit open boards, a "Tidy layout" command (dagre, through canvas.js), refactor commands (pack, unpack dissolve / copy, merge,
// split, extract), archive/restore, view tools (search current canvas, filter pane, fold, select children / same tag / same color), card templates and a status bar card count. Writes skill/SKILL.md to
// .claude/skills/canvas-board/ on load when missing; after that the vault copy is the user's, edited in Settings > Agent instructions (command "Reset agent skill").
// The agent workflow (what a pass takes, roll-up, check) is workflow.js; here only the "Workflow" toggles gate.
// apm.js: the APM counter in the status bar, on canvases only.
const { Plugin, Notice, PluginSettingTab, Setting, Modal, FuzzySuggestModal, AbstractInputSuggest, Scope, setIcon } = require('obsidian');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// [color name, canvas color, command key, default label]. Labels can be edited in Settings > Workflow.
const COLORS = [
	['none', '', '0', 'Inbox'],
	['red', '1', '1', 'Blocked'],
	['orange', '2', '2', 'In Progress'],
	['yellow', '3', '3', 'Review'],
	['green', '4', '4', 'Done'],
	['cyan', '5', '5', 'Do'],
	['purple', '6', '6', 'Clarify'],
];

// Terminal command: empty = the platform's terminal (defaultLaunch); else {vault} {board} {claude} are replaced
// and quoted parts stay one argument.
const DEFAULTS = {
	defaultBoard: 'Board.canvas',
	claudePath: '',
	layoutDirection: 'TB', // TB, LR, BT or RL
	colorLabels: {}, // color name → label, when edited (Settings > Workflow)
	cardWarning: '60',
	staleDays: '7', // yellow cards whose note is untouched this long get a warning badge (and the rollup's `· Nd`)
	hideTagBranches: true, // a hidden tag also hides the cards below its cards (in the fold direction)
	foldDirection: 'out', // fold hides the cards a card points to (out) or the cards pointing to it (in)
	terminal: '',
	passColors: 'cyan purple', // cards that start a pass (and that tree --active takes, see workflow.js); empty = never
	notesFolder: 'Board notes', // where the agent keeps the notes it makes for cards (read by workflow.js and the skill)
	archiveMode: 'board', // board: archive notes in "<board> archive/" next to each board; global: all in archiveFolder
	archiveFolder: 'Board notes/Archive', // the one archive folder when archiveMode is global
};
const COLOR_NUM = { red: '1', orange: '2', yellow: '3', green: '4', cyan: '5', purple: '6' };
const parseColors = s => new Set(String(s || '').split(/[\s,]+/).filter(Boolean).map(c => COLOR_NUM[c.toLowerCase()] || c).filter(c => /^[1-6]$/.test(c)));
// Settings > Workflow: what each color does (as in the skill). Fixed: the label above is only how it reads.
const WORKFLOW = [
	['cyan', 'The agent carries the card to done.'],
	['purple', 'The agent takes one step, then hands back.'],
	['orange', 'A pass is on the card.'],
	['yellow', 'A question or a review for you.'],
	['red', 'Nothing moves until it is unblocked.'],
	['green', 'Finished. Remove the card when it no longer helps.'],
	['none', 'No state. The agent never touches it.'],
];
// Tidy layout directions, in the order shift-click cycles them. `turn`: how far the button's icon rotates.
const LAYOUT_DIRS = {
	TB: { name: 'top to bottom', turn: 0 },
	LR: { name: 'left to right', turn: -90 },
	BT: { name: 'bottom to top', turn: 180 },
	RL: { name: 'right to left', turn: 90 },
};
// The icon's next rotation for a direction: the shortest way there, so cycling keeps turning the same way.
const nextTurn = (current, target) => current + ((target - current) % 360 + 540) % 360 - 180;

// The pass's terminal when the "Terminal command" setting is empty: [command, args], or null (no terminal found).
// Windows Terminal; macOS Terminal.app through AppleScript (paths passed as argv, quoted by the shell);
// on Linux the first known terminal on PATH. `claude` runs in the vault folder with the skill as its prompt.
const onPath = bin => String(process.env.PATH || '').split(path.delimiter).some(d => d && fs.existsSync(path.join(d, bin)));
const LINUX_TERMINALS = [ // [binary, (vault, command) => args]
	['gnome-terminal', (v, c) => [`--working-directory=${v}`, '--', ...c]],
	['konsole', (v, c) => ['--workdir', v, '-e', ...c]],
	['xfce4-terminal', (v, c) => ['--working-directory', v, '-x', ...c]],
	['kitty', (v, c) => ['--directory', v, ...c]],
	['alacritty', (v, c) => ['--working-directory', v, '-e', ...c]],
	['wezterm', (v, c) => ['start', '--cwd', v, '--', ...c]],
	['foot', (v, c) => [`--working-directory=${v}`, ...c]],
	['x-terminal-emulator', (v, c) => ['-e', ...c]],
	['xterm', (v, c) => ['-e', ...c]],
];
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

// Claude Code: the setting, else the native installer's ~/.local/bin/claude(.exe), else `claude` on PATH.
function claudeBin(setting) {
	if (setting) return setting;
	const local = path.join(os.homedir(), '.local', 'bin', process.platform === 'win32' ? 'claude.exe' : 'claude');
	return fs.existsSync(local) ? local : 'claude';
}

module.exports = class CanvasBoardPlugin extends Plugin {
	async onload() {
		this.settings = Object.assign({}, DEFAULTS, await this.loadData());
		this.addSettingTab(new CanvasBoardSettings(this.app, this));
		const dir = path.join(this.app.vault.adapter.basePath, this.manifest.dir);
		const script = path.join(dir, 'canvas.js');
		const req = window.require || require; // the plugin's own require has no cache to clear on reload
		if (req.cache) delete req.cache[script];
		const cb = req(script);
		const { applyOps, layoutOps } = cb;
		this.cb = cb;
		const apmScript = path.join(dir, 'apm.js');
		if (req.cache) delete req.cache[apmScript];
		const apmLib = req(apmScript);
		let legacyApm;
		if (!this.settings.apm) { try { legacyApm = JSON.parse(fs.readFileSync(path.join(dir, '..', 'apm-counter', 'data.json'), 'utf8')); } catch (e) { /* never installed */ } }
		this.settings.apm = apmLib.loadSettings(this.settings.apm, legacyApm);
		this.apm = new apmLib.ApmCounter(this, this.settings.apm, () => this.saveData(this.settings));
		this.apm.load();
		this.register(() => this.apm.unload());
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
		this.addCommand({
			id: 'reset-skill',
			name: "Reset agent skill to the plugin's version (overwrites your edits)",
			callback: () => this.syncSkill(dir, true),
		});

		for (const [name, color, key] of COLORS) {
			this.addCommand({
				id: `color-${key}`,
				name: this.colorCommandName(name),
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

		// Selected cards only (2+; the rest never moves): never the whole board unasked (Ctrl+A first). Ctrl+Z undoes it.
		this.addCommand({
			id: 'tidy-layout',
			name: 'Tidy layout (selected cards)',
			checkCallback: checking => {
				const canvas = this.activeCanvas();
				if (!canvas) return false;
				if (!checking) {
					if (canvas.selection.size < 2) {
						new Notice('Tidy layout: select the cards to tidy first (2 or more; Ctrl+A for the whole canvas).');
						return true;
					}
					const ids = [...canvas.selection].map(n => n.id);
					const d = canvas.getData();
					this.edit(canvas, layoutOps(d, { ids, dir: this.settings.layoutDirection, dagre, flow: this.settings.foldDirection }), d);
				}
				return true;
			},
		});
		this.addCommand({
			id: 'tidy-direction-next',
			name: 'Tidy layout direction: next',
			callback: () => this.cycleLayoutDirection(),
		});
		for (const [dir, { name }] of Object.entries(LAYOUT_DIRS))
			this.addCommand({
				id: `tidy-direction-${dir.toLowerCase()}`,
				name: `Tidy layout direction: ${name}`,
				checkCallback: checking => {
					if (this.settings.layoutDirection === dir) return false;
					if (!checking) this.setLayoutDirection(dir);
					return true;
				},
			});

		// Refactor and archive commands: one undo step each (Ctrl+Z), same code as canvas.js for agents.
		// Each is also a right-click item (label `menu`) on the cards it applies to.
		// `menu` is [title, Lucide icon], or null for a command with no menu item.
		const actions = this.actions = [];
		const runAction = this.runAction = (run, canvas, sel) => Promise.resolve(run(canvas, sel)).catch(e => new Notice(`Canvas board: ${e.message}`));
		const canvasCommand = (id, name, menu, test, run) => {
			actions.push({ id, menu, test, run });
			this.addCommand({
				id, name,
				checkCallback: checking => {
					const canvas = this.activeCanvas();
					if (!canvas || !test(canvas, [...canvas.selection])) return false;
					if (!checking) runAction(run, canvas, [...canvas.selection]);
					return true;
				},
			});
		};
		const isText = n => n.getData().type === 'text';

		// Pack / unpack (ids stay collapse / expand so hotkeys keep working). Pack moves cards into a new subcanvas.
		canvasCommand('collapse', 'Pack into subcanvas', ['Pack into subcanvas', 'package'], (c, sel) => sel.length > 0, (canvas, sel) =>
			new NamePrompt(this.app, 'Subcanvas name', async name => {
				const board = this.activeFile();
				const dir = board.parent && board.parent.path !== '/' ? board.parent.path + '/' : '';
				const file = this.freePath(dir, name, '.canvas');
				const { ops, sub } = cb.collapseOps(canvas.getData(), sel.map(n => n.id), file, name);
				await this.app.vault.create(file, JSON.stringify(sub, null, '\t'));
				this.edit(canvas, ops);
				this.undoNotice(canvas, `packed ${sel.length} card${sel.length > 1 ? 's' : ''} into ${file}`, [file]);
			}).open());

		// Unpack (dissolve) = cut and paste: the cards come out, the file goes to the trash. Other links to the file
		// (cards on any canvas, notes) would break: then a choice. Unpack (copy) = copy and paste: the file stays.
		const linked = (c, sel) => sel.length === 1 && !!this.linkedCanvas(sel[0]);
		canvasCommand('expand', 'Unpack subcanvas (dissolve)', ['Unpack subcanvas (dissolve)', 'package-open'], linked, async (canvas, [node]) => {
			const file = this.linkedCanvas(node);
			const links = await this.subcanvasLinks(file, canvas, node.id);
			if (!links.length) return this.unpack(canvas, node, file, 'dissolve');
			new UnpackChoice(this.app, file, links, mode => this.unpack(canvas, node, file, mode, links).catch(e => new Notice(`Canvas board: ${e.message}`))).open();
		});
		canvasCommand('unpack-copy', 'Unpack subcanvas (copy)', ['Unpack subcanvas (copy)', 'copy'], linked, (canvas, [node]) =>
			this.unpack(canvas, node, this.linkedCanvas(node), 'copy'));

		canvasCommand('merge', 'Merge selected cards', ['Merge cards', 'merge'], (c, sel) => sel.length > 1 && sel.every(isText), (canvas, sel) =>
			this.edit(canvas, cb.mergeOps(canvas.getData(), sel.map(n => n.id))));

		// Only the top-level split is a menu item; the others stay commands.
		for (const [by, label] of [['paragraph', 'paragraph'], ['bullet', 'top-level bullet'], ['h1', 'heading 1'], ['h2', 'heading 2'], ['h3', 'heading 3']])
			canvasCommand(`split-${by}`, `Split card by ${label}`, by === 'bullet' ? ['Split by top-level bullet', 'split'] : null, (c, sel) => sel.length === 1 && isText(sel[0]) && !sel[0].isEditing, (canvas, [node]) =>
				this.edit(canvas, cb.splitOps(canvas.getData(), node.id, by)));

		// The card being edited, with text selected: the selection becomes a new card.
		canvasCommand('extract', 'Extract current selection to a new card', ['Extract current selection to a new card', 'text-select'], (c, sel) => sel.length === 1 && sel[0].isEditing && !!this.cardEditor(sel[0]), (canvas, [node]) => {
			const editor = this.cardEditor(node);
			const part = editor.getSelection();
			if (!part.trim()) throw new Error('select some text in the card first');
			const from = editor.posToOffset(editor.getCursor('from'));
			const before = editor.getValue();
			editor.replaceSelection('');
			node.blur();
			const d = canvas.getData();
			const n = d.nodes.find(x => x.id === node.id);
			if (n) n.text = before; // the editor may not have saved yet: work from what it showed
			this.edit(canvas, cb.extractOps(d, node.id, part, from), d);
		});

		canvasCommand('archive', 'Archive selected cards', ['Archive', 'archive'], (c, sel) => sel.length > 0, async (canvas, sel) => {
			const board = this.activeFile().path;
			const d = canvas.getData();
			const dir = cb.archiveDir(board, this.settings);
			if (!this.app.vault.getAbstractFileByPath(dir)) await this.app.vault.createFolder(dir);
			const notes = [];
			for (const node of sel) {
				const a = cb.archiveNote(d, node.id, board, window.moment().format('YYYY-MM-DD'), this.cardContexts(node, board));
				notes.push(this.freePath(dir + '/', a.name, '.md'));
				await this.app.vault.create(notes[notes.length - 1], a.content);
			}
			this.edit(canvas, sel.map(n => ({ op: 'remove', id: n.id })));
			this.undoNotice(canvas, `archived ${sel.length} card${sel.length > 1 ? 's' : ''}`, notes);
		});

		// Fold hides the cards linked to a card, following edges in the "Fold direction" setting (out: the cards it
		// points to, then on; in: the cards pointing to it, then on). Unfold shows N levels again and folds the cards
		// at level N, so a branch opens in stages, like folders. Folds are stored on the card (see foldOf), so Ctrl+Z
		// undoes them. With several cards selected, each one that can be folded (or unfolded) is.
		const canFold = (c, n) => !this.foldOf(n) && this.branchLinks(c, this.settings.foldDirection).has(n.id);
		canvasCommand('fold', 'Fold branch', ['Fold branch', 'chevrons-down-up'], (c, sel) => sel.some(n => canFold(c, n)), (canvas, sel) =>
			this.setFolds(canvas, new Map(sel.filter(n => canFold(canvas, n)).map(n => [n.id, this.settings.foldDirection]))));
		for (const [levels, id, name, menu] of [[1, 'unfold', 'Unfold branch 1 level', ['Unfold 1 level', 'chevron-down']],
			[2, 'unfold-2', 'Unfold branch 2 levels', null], [3, 'unfold-3', 'Unfold branch 3 levels', null],
			[Infinity, 'unfold-all', 'Unfold whole branch', ['Unfold whole branch', 'chevrons-up-down']]])
			canvasCommand(id, name, menu, (c, sel) => sel.some(n => this.unfoldTargets(c, n.id).length), (canvas, sel) =>
				this.unfold(canvas, [...new Set(sel.flatMap(n => this.unfoldTargets(canvas, n.id)))], levels));
		for (const [dir, label] of [['out', 'outgoing (cards it points to)'], ['in', 'incoming (cards pointing to it)']])
			this.addCommand({
				id: `fold-direction-${dir}`,
				name: `Fold direction: ${label}`,
				checkCallback: checking => {
					if (this.settings.foldDirection === dir) return false;
					if (!checking) {
						this.settings.foldDirection = dir;
						this.saveData(this.settings);
						new Notice(`Canvas board: fold direction ${label}`);
					}
					return true;
				},
			});

		// Templates: the selection (and edges between its cards) as Templates/Canvas/<name>.canvas. Typing the name
		// suggests the existing templates: picking one (or typing its name) overwrites it, the button says so.
		const templates = () => this.app.vault.getFiles().filter(f => f.extension === 'canvas' && f.path.startsWith(cb.TEMPLATE_DIR + '/'));
		const templateName = f => f.path.slice(cb.TEMPLATE_DIR.length + 1, -'.canvas'.length); // subfolders kept
		canvasCommand('template-save', 'Save selected cards as a template', ['Save as template', 'layout-template'], (c, sel) => sel.length > 0, canvas => {
			const existing = new Map(templates().map(f => [templateName(f).toLowerCase(), f]));
			new NamePrompt(this.app, 'Template name', async name => {
				const content = JSON.stringify((({ nodes, edges }) => ({ nodes, edges }))(canvas.getSelectionData()), null, '\t');
				const old = existing.get(name.toLowerCase());
				if (old) { await this.app.vault.modify(old, content); new Notice(`Canvas board: template ${old.path} overwritten`); return; }
				if (!this.app.vault.getAbstractFileByPath(cb.TEMPLATE_DIR)) await this.app.vault.createFolder(cb.TEMPLATE_DIR);
				const file = this.freePath(cb.TEMPLATE_DIR + '/', name, '.canvas');
				await this.app.vault.create(file, content);
				new Notice(`Canvas board: template saved to ${file}`);
			}, { suggestions: [...existing.values()].map(templateName), overwrite: v => existing.has(v.toLowerCase()) }).open();
		});
		// Selection tools: the selection grows to related cards (visible ones only: hidden cards never stay selected).
		// Children: every level down, in the fold direction. The selected cards stay selected.
		const cards = sel => sel.filter(n => !n.from && n.getData().type !== 'group');
		const selectMore = this.selectMore = (canvas, sel, keep) => {
			const add = [...canvas.nodes.values()].filter(n => n.getData().type !== 'group' && !this.isHidden(canvas, n) && keep(n));
			canvas.updateSelection(() => { canvas.selection.clear(); for (const n of [...sel, ...add]) canvas.selection.add(n); });
			return add.length;
		};
		const childIds = (c, sel) => new Set(cards(sel).flatMap(n => this.branchLevels(c, n.id, this.settings.foldDirection).flat()));
		canvasCommand('select-children', 'Select children (all levels down, in the fold direction)', ['Select children', 'list-tree'],
			(c, sel) => [...childIds(c, sel)].some(id => c.nodes.get(id) && !this.isHidden(c, c.nodes.get(id)) && !c.selection.has(c.nodes.get(id))),
			(canvas, sel) => { const ids = childIds(canvas, sel); selectMore(canvas, sel, n => ids.has(n.id)); });
		const tagsOf = sel => new Set(cards(sel).flatMap(n => [...this.cardTagSet(n)]));
		canvasCommand('select-same-tag', 'Select cards with the same tag', ['Select same tag', 'tag'], (c, sel) => tagsOf(sel).size > 0, (canvas, sel) => {
			const tags = tagsOf(sel);
			selectMore(canvas, sel, n => [...this.cardTagSet(n)].some(t => tags.has(t)));
		});
		canvasCommand('select-same-color', 'Select cards with the same color', ['Select same color', 'palette'], (c, sel) => cards(sel).length > 0, (canvas, sel) => {
			const colors = new Set(cards(sel).map(n => n.getData().color || ''));
			selectMore(canvas, sel, n => colors.has(n.getData().color || ''));
		});

		this.addCommand({
			id: 'template-insert',
			name: 'Insert cards from template',
			checkCallback: checking => {
				const canvas = this.activeCanvas();
				if (!canvas) return false;
				if (!checking) {
					const files = this.app.vault.getFiles().filter(f => f.extension === 'canvas' && f.path.startsWith(cb.TEMPLATE_DIR + '/'));
					if (!files.length) new Notice(`Canvas board: no template in ${cb.TEMPLATE_DIR} (Save selected cards as a template)`);
					else new Picker(this.app, 'Template', files, f => f.basename, f => this.insertTemplate(canvas, f)).open();
				}
				return true;
			},
		});

		// Search, filter: the active canvas only. Filter and folds hide cards (styles.css). The filter is
		// view only (the file is untouched, it resets when the board is reopened); folds are in the file.
		this.views = new WeakMap(); // canvas → { xcolors, xtags (hidden colors and tags), hidden (card ids) }
		this.panes = new Map(); // canvas → FilterPane, one per open canvas
		// A find bar like the one in notes (count, previous / next, all), named after Obsidian's "Search current file".
		this.finds = new Map(); // canvas → FindBar
		this.addCommand({
			id: 'find',
			name: 'Search current canvas',
			checkCallback: checking => {
				const canvas = this.activeCanvas();
				if (!canvas) return false;
				if (!checking) {
					let f = this.finds.get(canvas);
					if (!f) { f = new FindBar(this, canvas); this.finds.set(canvas, f); }
					f.open();
				}
				return true;
			},
		});
		this.addCommand({
			id: 'filter',
			name: 'Toggle filter pane',
			checkCallback: checking => {
				const canvas = this.activeCanvas();
				if (!canvas) return false;
				if (!checking) this.pane(canvas).toggle();
				return true;
			},
		});
		this.addCommand({
			id: 'show-all',
			name: 'Unhide all',
			checkCallback: checking => {
				const canvas = this.activeCanvas();
				if (!canvas || !this.viewLabel(canvas)) return false;
				if (!checking) this.showAll(canvas);
				return true;
			},
		});

		// Right-click on one card, on a selection, or inside a card being edited (Extract).
		const addActions = (menu, canvas, sel) => {
			for (const a of actions) if (a.menu && a.test(canvas, sel))
				menu.addItem(item => item.setTitle(this.keyedTitle(a.menu[0], a.id)).setIcon(a.menu[1]).setSection('canvas-board').onClick(() => runAction(a.run, canvas, sel)));
		};
		this.registerEvent(this.app.workspace.on('canvas:selection-menu', (menu, canvas) => addActions(menu, canvas, [...canvas.selection])));
		this.registerEvent(this.app.workspace.on('canvas:node-menu', (menu, node) =>
			addActions(menu, node.canvas, node.canvas.selection.has(node) ? [...node.canvas.selection] : [node])));
		this.registerEvent(this.app.workspace.on('editor-menu', (menu, editor) => {
			const canvas = this.activeCanvas();
			const node = canvas && [...canvas.selection].find(n => n.isEditing && this.cardEditor(n) === editor);
			if (node) addActions(menu, canvas, [node]);
		}));

		const isArchived = file => {
			const fm = file && file.extension === 'md' && (this.app.metadataCache.getFileCache(file) || {}).frontmatter;
			return !!(fm && fm['archived-from']);
		};
		this.addCommand({
			id: 'restore',
			name: 'Restore archived card (from its archive note)',
			checkCallback: checking => {
				const file = this.app.workspace.getActiveFile();
				if (!isArchived(file)) return false;
				if (!checking) this.restore(file).catch(e => new Notice(`Canvas board: ${e.message}`));
				return true;
			},
		});
		// Right-click on an archive note: a link to it, the file explorer, its tab.
		this.registerEvent(this.app.workspace.on('file-menu', (menu, file) => {
			if (isArchived(file)) menu.addItem(item => item.setTitle('Restore archived card').setIcon('archive-restore').setSection('canvas-board')
				.onClick(() => this.restore(file).catch(e => new Notice(`Canvas board: ${e.message}`))));
		}));

		this.addCommand({
			id: 'run-pass',
			name: 'Run pass (recheck the board)',
			callback: () => this.runPass(),
		});
		this.addCommand({
			id: 'open-board',
			name: 'Open the board',
			callback: () => this.openBoard(),
		});
		this.addCommand({
			id: 'create-starter-board',
			name: 'Create a starter board (color legend and first cards)',
			callback: () => this.createStarterBoard(),
		});
		this.addRibbonIcon('kanban-square', 'Open the board (Canvas board)', () => this.openBoard());

		// Card count of the active canvas in the status bar: boards get hard to manage past a threshold.
		// Next to it, the active filter and folds; click to change them.
		this.countEl = this.addStatusBarItem();
		this.viewEl = this.addStatusBarItem();
		this.viewEl.addClass('mod-clickable');
		this.viewEl.onClickEvent(() => { const c = this.activeCanvas(); if (c) this.pane(c).toggle(true); });
		const tick = () => {
			this.updateCount();
			// Cards that come into view or are added get the classes again. Every open canvas has its filter pane.
			const open = new Set();
			for (const l of this.app.workspace.getLeavesOfType('canvas')) {
				const canvas = l.view.canvas;
				if (!canvas || !canvas.wrapperEl) continue;
				open.add(canvas);
				this.decorate(l.view);
				this.refreshView(canvas); // folds come with the file: every canvas
				this.pane(canvas).update();
			}
			for (const [canvas, pane] of this.panes) if (!open.has(canvas)) { pane.destroy(); this.panes.delete(canvas); }
			for (const [canvas, f] of this.finds) if (!open.has(canvas)) { f.destroy(); this.finds.delete(canvas); }
		};
		this.registerEvent(this.app.workspace.on('active-leaf-change', tick));
		this.registerInterval(window.setInterval(tick, 2000));
		tick();
		this.register(() => {
			for (const pane of this.panes.values()) pane.destroy();
			this.panes.clear();
			for (const f of this.finds.values()) f.destroy();
			this.finds.clear();
			for (const l of this.app.workspace.getLeavesOfType('canvas')) {
				const canvas = l.view.canvas;
				this.undecorate(l.view);
				if (!this.views.has(canvas)) continue;
				delete canvas.updateSelection;
				delete canvas.applyHistory;
				this.paint(canvas, new Set(), new Map()); // folds stay in the file, only the screen is cleared
			}
		});
	}

	// --- Presentation: where the commands show on screen ---------------------------------------------------------
	// Control bar and selection toolbar are undocumented canvas DOM (.canvas-controls, canvas.menu.render), like
	// folds and the filter pane: an Obsidian update may drop those buttons, the commands stay. Header action and
	// ribbon icon are documented API. See "Obsidian internals" in README.md.

	// Label of a color: the one edited in Settings > Workflow, else the default.
	colorLabel(name) {
		return (this.settings.colorLabels || {})[name] || COLORS.find(c => c[0] === name)[3];
	}

	colorCommandName(name) {
		return `Color selected cards: ${name} (${this.colorLabel(name)})`;
	}

	// An edited label also renames its command in the palette and the hotkey list. The id, and so the key, stays.
	async setColorLabel(name, label) {
		const labels = this.settings.colorLabels = { ...this.settings.colorLabels };
		if (label) labels[name] = label; else delete labels[name];
		await this.saveData(this.settings);
		const row = COLORS.find(c => c[0] === name);
		const cmd = this.app.commands && this.app.commands.commands[`${this.manifest.id}:color-${row[2]}`];
		if (cmd) cmd.name = `${this.manifest.name}: ${this.colorCommandName(name)}`;
		for (const canvas of this.panes.keys()) this.refreshView(canvas);
	}

	// Hotkey of a plugin command as Obsidian prints it ("Alt + ↑"), or ''.
	hotkey(id) {
		const hm = this.app.hotkeyManager;
		try { return (hm && hm.printHotkeyForCommand && hm.printHotkeyForCommand(`${this.manifest.id}:${id}`)) || ''; } catch (e) { return ''; }
	}

	// Tooltip with its key, the way the canvas's own buttons show it ("Zoom to selection\n(Shift + 2)").
	keyedLabel(label, id) {
		const k = this.hotkey(id);
		return k ? `${label}\n(${k})` : label;
	}

	// Menu item title with its key, muted, after the label.
	keyedTitle(label, id) {
		const k = this.hotkey(id);
		if (!k) return label;
		return createFragment(f => { f.appendText(label); f.createSpan({ cls: 'canvas-board-key', text: k }); });
	}

	// A notice with an Undo button: one canvas undo step and the files the action made go to the trash. Only while
	// the board has not changed since (else the undo would take back something else).
	// `restore` ({ path, content }) brings a trashed file back on undo (unpack). Redirected links are not undone.
	undoNotice(canvas, msg, files = [], restore = null) {
		const h = canvas.history;
		const at = h ? h.current : null;
		const frag = createFragment(f => {
			f.appendText(`Canvas board: ${msg} `);
			const b = f.createEl('button', { cls: 'canvas-board-notice-undo', text: 'Undo' });
			b.addEventListener('click', async () => {
				if (!h || h.current !== at) { new Notice('Canvas board: the board changed since, use Ctrl+Z'); return; }
				canvas.undo();
				for (const p of files) { const file = this.app.vault.getAbstractFileByPath(p); if (file) await this.app.fileManager.trashFile(file); }
				if (restore && !this.app.vault.getAbstractFileByPath(restore.path)) await this.app.vault.create(restore.path, restore.content);
			});
		});
		new Notice(frag, 8000);
	}

	async openBoard() {
		const board = this.settings.defaultBoard;
		const leaf = this.app.workspace.getLeavesOfType('canvas').find(l => l.view.file && l.view.file.path === board);
		if (leaf) { this.app.workspace.setActiveLeaf(leaf, { focus: true }); return; }
		const file = this.app.vault.getAbstractFileByPath(board);
		if (!file) {
			new Notice(createFragment(f => {
				f.appendText(`Canvas board: ${board} not found (setting "Default board"). `);
				const b = f.createEl('button', { cls: 'canvas-board-notice-undo', text: 'Create a starter board' });
				b.addEventListener('click', () => this.createStarterBoard());
			}), 10000);
			return;
		}
		await this.app.workspace.getLeaf(false).openFile(file);
	}

	// Onboarding: the default board when it does not exist yet, else "Starter board.canvas" (numbered when taken).
	// A legend group (one card per color: its label and what it does, from Settings > Workflow) and a group of
	// first steps, one of them a wish to color cyan and run a pass on. Opens it.
	async createStarterBoard() {
		const vault = this.app.vault;
		let board = this.settings.defaultBoard;
		if (vault.getAbstractFileByPath(board)) {
			const dir = path.posix.dirname(board) === '.' ? '' : `${path.posix.dirname(board)}/`;
			let n = 1;
			do board = `${dir}Starter board${n > 1 ? ` ${n}` : ''}.canvas`; while (vault.getAbstractFileByPath(board) && ++n);
		}
		const id = () => Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
		const nodes = [];
		const edges = [];
		const W = 400;
		nodes.push({ id: id(), type: 'group', label: 'How the colors work', x: -40, y: -80, width: W + 80, height: WORKFLOW.length * 100 + 100 });
		// Legend cards stay uncolored (a colored one would be state: a pass would take the cyan and purple ones),
		// an emoji dot stands for the color.
		const DOT = { cyan: '🔵', purple: '🟣', orange: '🟠', yellow: '🟡', red: '🔴', green: '🟢', none: '⚪' };
		WORKFLOW.forEach(([name, meaning], i) => {
			nodes.push({ id: id(), type: 'text', text: `${DOT[name]} **${this.colorLabel(name)}** (${COLOR_NUM[name] ? name : 'uncolored'})\n${meaning}`, x: 0, y: i * 100, width: W, height: 80 });
		});
		const steps = [
			'**1. Write a wish**\nOne card, one thing you want done, in your own words. Uncolored cards are ideas: the agent never touches them.',
			'**2. Color it**\nCyan: the agent carries it to done. Purple: one step (a brief, then a plan), then it hands back. Color hotkeys: Settings > Canvas board > Hotkeys.',
			'**3. Run a pass**\nCommand "Canvas board: Run pass". A terminal opens with the agent on this board; it turns the cards it takes orange.',
			'**4. Answer**\nYellow: a question or a review for you, in the card\'s note. Answer there, color the card cyan or purple again, run the next pass.',
		];
		const x0 = W + 160;
		nodes.push({ id: id(), type: 'group', label: 'First steps', x: x0 - 40, y: -80, width: W + 80, height: steps.length * 160 + 280 });
		let prev;
		steps.forEach((text, i) => {
			const card = { id: id(), type: 'text', text, x: x0, y: i * 160, width: W, height: 130 };
			nodes.push(card);
			if (prev) edges.push({ id: id(), fromNode: prev, fromSide: 'bottom', toNode: card.id, toSide: 'top' });
			prev = card.id;
		});
		nodes.push({ id: id(), type: 'text', text: 'Try it: color this card cyan, then run a pass.\n\nWrite a short note that explains this board in my own words.', x: x0, y: steps.length * 160 + 20, width: W, height: 130 });
		try {
			const dir = path.posix.dirname(board);
			if (dir !== '.' && !vault.getAbstractFileByPath(dir)) await vault.createFolder(dir);
			const file = await vault.create(board, JSON.stringify({ nodes, edges }, null, '\t'));
			await this.app.workspace.getLeaf(false).openFile(file);
			new Notice(`Canvas board: starter board created (${board})`);
		} catch (e) {
			new Notice(`Canvas board: could not create the starter board (${e.message})`);
		}
	}

	async setLayoutDirection(dir) {
		this.settings.layoutDirection = dir;
		await this.saveData(this.settings);
		for (const leaf of this.app.workspace.getLeavesOfType('canvas')) this.decorate(leaf.view);
		new Notice(`Canvas board: tidy layout ${LAYOUT_DIRS[dir].name}`);
	}

	cycleLayoutDirection() {
		const dirs = Object.keys(LAYOUT_DIRS);
		return this.setLayoutDirection(dirs[(dirs.indexOf(this.settings.layoutDirection) + 1) % dirs.length]);
	}

	// Runs a plugin command on this canvas view (made active first: a click on its buttons may not focus it).
	runOn(view, id) {
		const leaf = this.app.workspace.getLeavesOfType('canvas').find(l => l.view === view);
		if (leaf && this.app.workspace.activeLeaf !== leaf) this.app.workspace.setActiveLeaf(leaf, { focus: true });
		this.app.commands.executeCommandById(`${this.manifest.id}:${id}`);
	}

	// Buttons on a canvas view, added once (tick runs every 2 s and adds back what the canvas redrew away).
	decorate(view) {
		const canvas = view.canvas;
		// View header: Run pass, a command about the whole board.
		if (!view.canvasBoardAction && view.addAction)
			view.canvasBoardAction = view.addAction('play', 'Run pass', () => this.runPass());
		if (view.canvasBoardAction) view.canvasBoardAction.setAttr('aria-label', this.keyedLabel('Run pass', 'run-pass'));
		// Control bar (top right): Search, Filter, Tidy layout, above Canvas help.
		const controls = canvas.wrapperEl && canvas.wrapperEl.querySelector('.canvas-controls');
		if (controls) {
			let group = controls.querySelector('.canvas-board-controls');
			if (!group) {
				group = createDiv({ cls: 'canvas-control-group mod-raised canvas-board-controls' });
				const help = controls.lastElementChild;
				controls.insertBefore(group, help);
				for (const [id, label, icon] of [['find', 'Search current canvas', 'search'], ['filter', 'Filter cards', 'filter'], ['tidy-layout', 'Tidy layout', 'network']]) {
					const b = group.createDiv({ cls: 'canvas-control-item', attr: { 'data-command': id, 'data-label': label, 'data-tooltip-position': 'left' } });
					setIcon(b, icon);
					b.addEventListener('click', e => {
						if (id === 'tidy-layout' && e.shiftKey) this.cycleLayoutDirection();
						else this.runOn(view, id);
					});
				}
			}
			for (const b of group.children) b.setAttr('aria-label', this.keyedLabel(b.dataset.label, b.dataset.command));
			// The tidy icon points the way the layout flows; its tooltip says so and how to change it.
			const tidy = group.querySelector('[data-command="tidy-layout"]');
			const dir = LAYOUT_DIRS[this.settings.layoutDirection] || LAYOUT_DIRS.TB;
			if (tidy) {
				this.tidyTurn = nextTurn(this.tidyTurn ?? dir.turn, dir.turn);
				tidy.style.setProperty('--canvas-board-tidy-turn', `${this.tidyTurn}deg`);
				tidy.setAttr('aria-label', this.keyedLabel(`Tidy layout: ${dir.name}\nShift-click: next direction`, 'tidy-layout'));
			}
		}
		// Selection toolbar: Fold, Unfold, Archive after the canvas's own buttons, when they apply.
		const menu = canvas.menu;
		if (menu && menu.render && !menu.canvasBoardRender) {
			const orig = menu.canvasBoardRender = menu.render;
			const plugin = this;
			menu.render = function (...a) {
				const r = orig.apply(this, a);
				try { plugin.menuButtons(canvas); } catch (e) { console.error('canvas-board: selection toolbar', e); }
				return r;
			};
			// The color picker opens on click: its swatches get the state as tooltip.
			menu.canvasBoardObserver = new MutationObserver(() => {
				for (const item of menu.menuEl.querySelectorAll('.canvas-color-picker-item:not(.canvas-color-picker-custom)')) {
					const c = (item.className.match(/mod-canvas-color-(\d)/) || [])[1] || '';
					const row = COLORS.find(x => x[1] === c);
					if (row) item.setAttrs({ 'aria-label': this.keyedLabel(this.colorLabel(row[0]), `color-${row[2]}`), 'data-tooltip-position': 'top' });
				}
			});
			menu.canvasBoardObserver.observe(menu.menuEl, { childList: true, subtree: true });
		}
	}

	menuButtons(canvas) {
		const el = canvas.menu.menuEl;
		const sel = [...canvas.selection];
		if (!sel.length || !el.childElementCount || el.querySelector('.canvas-board-menu-btn')) return;
		for (const id of ['fold', 'unfold', 'archive']) {
			const a = this.actions.find(x => x.id === id);
			if (!a || !a.test(canvas, sel)) continue;
			const b = el.createEl('button', { cls: 'clickable-icon canvas-board-menu-btn', attr: { 'aria-label': this.keyedLabel(a.menu[0], id), 'data-tooltip-position': 'top' } });
			setIcon(b, a.menu[1]);
			b.addEventListener('click', () => this.runAction(a.run, canvas, [...canvas.selection]));
		}
	}

	undecorate(view) {
		const canvas = view.canvas;
		if (view.canvasBoardAction) { view.canvasBoardAction.remove(); delete view.canvasBoardAction; }
		if (canvas.wrapperEl) for (const el of canvas.wrapperEl.querySelectorAll('.canvas-board-controls, .canvas-board-menu-btn')) el.remove();
		const menu = canvas.menu;
		if (menu && menu.canvasBoardRender) {
			menu.render = menu.canvasBoardRender;
			delete menu.canvasBoardRender;
			menu.canvasBoardObserver.disconnect();
			delete menu.canvasBoardObserver;
		}
	}

	// Filter state of an open canvas. `create` false only reads (an empty state, not stored).
	viewState(canvas, create = true) {
		const empty = () => ({ xcolors: new Set(), xtags: new Set(), hidden: new Set() });
		let v = this.views.get(canvas);
		if (v || !create) return v || empty();
		v = empty();
		this.views.set(canvas, v);
		// Hidden cards never stay selected (select all, drag to select), so Delete never hits a card you can't see.
		const plugin = this;
		const orig = canvas.updateSelection;
		canvas.updateSelection = function (fn) {
			const r = orig.call(this, () => {
				fn();
				for (const x of [...this.selection]) if (v.hidden.has(x.id) || (x.from && (v.hidden.has(x.from.node.id) || v.hidden.has(x.to.node.id)))) this.selection.delete(x);
			});
			plugin.updateCount(); // selected count in the status bar follows at once
			return r;
		};
		// Undo / redo may bring folds back or take them away: redraw at once.
		const history = canvas.applyHistory;
		if (history) canvas.applyHistory = function (...a) {
			const r = history.apply(this, a);
			plugin.refreshView(this);
			return r;
		};
		return v;
	}

	isHidden(canvas, node) {
		return this.viewState(canvas, false).hidden.has(node.id);
	}

	// Clears the filter and unfolds every card (one undo step for the folds).
	showAll(canvas) {
		const v = this.viewState(canvas, false);
		v.xcolors.clear();
		v.xtags.clear();
		const folds = this.folds(canvas);
		if (folds.size) this.setFolds(canvas, new Map([...folds.keys()].map(id => [id, null])));
		else this.refreshView(canvas);
	}

	// A fold is stored on the card as "canvasBoard": {"folded": "in" | "out"} (the fold direction). JSON Canvas
	// 1.0 has no such field; other readers ignore it and show every card. Obsidian keeps it (node.unknownData).
	foldOf(node) {
		const cb = node.getData().canvasBoard;
		return (cb && cb.folded) || null;
	}

	folds(canvas) {
		const m = new Map();
		for (const n of canvas.nodes.values()) { const dir = this.foldOf(n); if (dir) m.set(n.id, dir); }
		return m;
	}

	// `changes`: card id → direction to fold, or null to unfold. One canvas edit, one undo step.
	setFolds(canvas, changes) {
		if (!changes.size) return;
		const d = canvas.getData();
		for (const n of d.nodes) {
			if (!changes.has(n.id)) continue;
			const cb = { ...(n.canvasBoard || {}) };
			const dir = changes.get(n.id);
			if (dir) cb.folded = dir; else delete cb.folded;
			if (Object.keys(cb).length) n.canvasBoard = cb; else delete n.canvasBoard;
		}
		this.edit(canvas, [], d);
		this.refreshView(canvas);
	}

	pane(canvas) {
		let p = this.panes.get(canvas);
		if (!p) { p = new FilterPane(this, canvas); this.panes.set(canvas, p); }
		return p;
	}

	// Card id → ids one edge away, following edges out (from → to) or in (to → from).
	branchLinks(canvas, dir) {
		const links = new Map();
		for (const e of canvas.edges.values()) {
			const [a, b] = dir === 'in' ? [e.to.node.id, e.from.node.id] : [e.from.node.id, e.to.node.id];
			if (a !== b) links.set(a, (links.get(a) || []).concat(b));
		}
		return links;
	}

	// Ids below a folded card, level by level (level 1 first).
	branchLevels(canvas, root, dir) {
		const links = this.branchLinks(canvas, dir);
		const seen = new Set([root]);
		const levels = [];
		let level = [root];
		while (level.length) {
			const next = [];
			for (const id of level) for (const x of links.get(id) || []) if (!seen.has(x)) { seen.add(x); next.push(x); }
			if (next.length) levels.push(next);
			level = next;
		}
		return levels;
	}

	// The cards an unfold on `id` applies to: the card itself if folded, else the nearest folded cards of its open
	// branch (in the fold direction, not past another fold), so pressing unfold again opens the next level.
	unfoldTargets(canvas, id) {
		const node = canvas.nodes.get(id);
		if (!node) return [];
		if (this.foldOf(node)) return [id];
		const links = this.branchLinks(canvas, this.settings.foldDirection);
		const seen = new Set([id]);
		const found = [];
		let level = [id];
		while (level.length) {
			const next = [];
			for (const x of level) for (const y of links.get(x) || []) {
				if (seen.has(y)) continue;
				seen.add(y);
				const n = canvas.nodes.get(y);
				if (n && this.foldOf(n)) found.push(y); else next.push(y);
			}
			level = next;
		}
		return found;
	}

	// Shows `levels` levels of each folded branch; the cards at the last shown level that lead further get folded.
	unfold(canvas, ids, levels) {
		const changes = new Map();
		for (const id of ids) {
			const node = canvas.nodes.get(id);
			const dir = node && this.foldOf(node);
			if (!dir) continue;
			changes.set(id, null);
			const below = this.branchLevels(canvas, id, dir);
			const links = this.branchLinks(canvas, dir);
			if (levels < below.length) for (const x of below[levels - 1]) if ((links.get(x) || []).length) changes.set(x, dir);
		}
		this.setFolds(canvas, changes);
	}

	// Tags of a card (no #): the `#tags` in its own text, never those of the notes it links. Exact match only:
	// #tag1 is not #tag10.
	cardTagSet(node) {
		const tags = new Set();
		for (const m of (node.getData().text || '').matchAll(/(?:^|\s)#([^\s#.,;:!?()[\]{}"'`]+)/g)) if (!/^\d+$/.test(m[1])) tags.add(m[1]);
		return tags;
	}

	// Every color and tag shows by default; a hidden color, or any hidden tag, hides the card.
	matches(node, v) {
		if (v.xcolors.has(node.getData().color || '')) return false;
		if (!v.xtags.size) return true;
		const tags = this.cardTagSet(node);
		return ![...v.xtags].some(t => tags.has(t));
	}

	filtering(v) {
		return !!(v.xcolors.size || v.xtags.size);
	}

	// Hidden = not matching the filter (groups always show), or below a folded card. With the setting "Hide cards
	// under hidden tags", a card hidden by a tag also hides its branch, as a fold in the fold direction would.
	refreshView(canvas) {
		const v = this.viewState(canvas);
		const hidden = new Set();
		if (this.filtering(v))
			for (const node of canvas.nodes.values()) if (node.getData().type !== 'group' && !this.matches(node, v)) hidden.add(node.id);
		if (v.xtags.size && this.settings.hideTagBranches)
			for (const node of canvas.nodes.values()) {
				const tags = this.cardTagSet(node);
				if (![...v.xtags].some(t => tags.has(t))) continue;
				for (const id of this.branchLevels(canvas, node.id, this.settings.foldDirection).flat())
					if (canvas.nodes.get(id) && canvas.nodes.get(id).getData().type !== 'group') hidden.add(id);
			}
		const folded = new Map();
		for (const [root, dir] of this.folds(canvas)) {
			const below = this.branchLevels(canvas, root, dir).flat();
			folded.set(root, below.length);
			for (const id of below) hidden.add(id);
		}
		v.hidden = hidden;
		this.paint(canvas, hidden, folded);
		if ([...canvas.selection].some(x => hidden.has(x.id))) canvas.updateSelection(() => {});
		if (canvas === this.activeCanvas()) this.updateViewLabel(canvas);
		const pane = this.panes.get(canvas);
		if (pane) pane.update();
	}

	// Hides the `hidden` cards and their edges; `folded` (id → count) gets the "· N folded" badge, a click on it
	// unfolds one level.
	paint(canvas, hidden, folded) {
		for (const node of canvas.nodes.values()) {
			node.nodeEl.toggleClass('canvas-board-hidden', hidden.has(node.id));
			let badge = node.nodeEl.querySelector(':scope > .canvas-board-folded');
			if (!folded.has(node.id)) { if (badge) badge.remove(); continue; }
			if (!badge) {
				badge = node.nodeEl.createDiv({ cls: 'canvas-board-folded', attr: { 'data-tooltip-position': 'bottom' } });
				for (const ev of ['pointerdown', 'mousedown', 'dblclick']) badge.addEventListener(ev, e => e.stopPropagation());
				badge.addEventListener('click', e => { e.stopPropagation(); this.unfold(canvas, [node.id], 1); });
			}
			badge.setText(`· ${folded.get(node.id)} folded`);
			badge.setAttr('aria-label', this.keyedLabel('Unfold 1 level', 'unfold'));
		}
		this.paintStale(canvas);
		for (const e of canvas.edges.values()) {
			const off = hidden.has(e.from.node.id) || hidden.has(e.to.node.id);
			for (const el of [e.lineGroupEl, e.lineEndGroupEl, e.labelElement && e.labelElement.wrapperEl]) if (el) el.classList.toggle('canvas-board-hidden', off);
		}
	}

	// Yellow (needs me) cards whose note was not touched for "Stale after" days: a warning badge (the icon of
	// `- [!]`) with the time since the note last changed. Cards without a note have no date: no badge.
	paintStale(canvas) {
		const days = Number(this.settings.staleDays) || 0;
		const board = canvas.view && canvas.view.file ? canvas.view.file.path : '';
		for (const node of canvas.nodes.values()) {
			const d = node.getData();
			let age = -1;
			if (days > 0 && d.color === '3') {
				let file = null;
				if (d.type === 'file') file = this.app.vault.getAbstractFileByPath(d.file);
				else if (d.type === 'text') {
					const m = /\[\[([^\]|#]+)/.exec(d.text || '');
					if (m) file = this.app.metadataCache.getFirstLinkpathDest(m[1].trim(), board);
				}
				if (file && file.stat) age = Math.floor((Date.now() - file.stat.mtime) / 86400000);
			}
			let badge = node.nodeEl.querySelector(':scope > .canvas-board-stale');
			if (age < days || age < 0) { if (badge) badge.remove(); continue; }
			if (!badge) {
				badge = node.nodeEl.createDiv({ cls: 'canvas-board-stale', attr: { 'data-tooltip-position': 'top' } });
				setIcon(badge.createSpan({ cls: 'canvas-board-stale-icon' }), 'triangle-alert');
				badge.createSpan({ cls: 'canvas-board-stale-text' });
			}
			const label = age < 1 ? 'today' : `${age}d`;
			if (badge.dataset.age !== label) {
				badge.dataset.age = label;
				badge.querySelector('.canvas-board-stale-text').setText(label);
				badge.setAttr('aria-label', `Waiting on you · note untouched for ${age} day${age === 1 ? '' : 's'} (stale after ${days})`);
			}
		}
	}

	// Status bar and closed pane: only how many cards are hidden (filter and folds); the pane says by what.
	viewLabel(canvas) {
		const n = this.viewState(canvas, false).hidden.size;
		return n ? `${n} card${n > 1 ? 's' : ''} hidden` : '';
	}

	updateViewLabel(canvas) {
		const label = canvas ? this.viewLabel(canvas) : '';
		this.viewEl.setText(label);
		this.viewEl.toggle(!!label);
	}

	cardText(node) {
		const d = node.getData();
		return String((d.type === 'text' ? d.text : d.type === 'file' ? d.file : d.type === 'link' ? d.url : d.label) || '');
	}

	// Background of a color dot: a preset canvas color ('1'…'6'), a custom hex, or none.
	dotStyle(color) {
		return !color ? '' : `background: ${color.startsWith('#') ? color : `var(--canvas-color-${color})`}`;
	}

	// Template cards are centered on the visible canvas, whatever is selected; they end up selected.
	async insertTemplate(canvas, file) {
		const tpl = JSON.parse(await this.app.vault.read(file));
		const nodes = tpl.nodes || [];
		const b = canvas.getViewportBBox();
		const w = nodes.length ? Math.max(...nodes.map(n => n.x + n.width)) - Math.min(...nodes.map(n => n.x)) : 0;
		const h = nodes.length ? Math.max(...nodes.map(n => n.y + n.height)) - Math.min(...nodes.map(n => n.y)) : 0;
		const at = { x: Math.round((b.minX + b.maxX - w) / 2), y: Math.round((b.minY + b.maxY - h) / 2) };
		const ops = this.cb.templateOps(tpl, at);
		this.edit(canvas, ops);
		const added = ops.filter(o => o.op === 'add').map(o => canvas.nodes.get(o.node.id)).filter(Boolean);
		canvas.updateSelection(() => { canvas.selection.clear(); for (const n of added) canvas.selection.add(n); });
	}

	updateCount() {
		const canvas = this.activeCanvas();
		this.updateViewLabel(canvas);
		if (!canvas) { this.countEl.setText(''); this.countEl.hide(); return; }
		const cards = [...canvas.nodes.values()].map(n => n.getData()).filter(n => n.type !== 'group');
		const names = { '': 'none', 1: 'red', 2: 'orange', 3: 'yellow', 4: 'green', 5: 'cyan', 6: 'purple' };
		const byColor = {};
		for (const n of cards) { const c = names[n.color || ''] || 'custom'; byColor[c] = (byColor[c] || 0) + 1; }
		const max = Number(this.settings.cardWarning) || 0;
		const over = max > 0 && cards.length > max;
		const sel = [...canvas.selection].filter(x => !x.from).length; // cards and groups, not edges
		// Only the card count takes the warning color, not the selected count.
		this.countEl.empty();
		this.countEl.createSpan({ text: `${cards.length} cards`, cls: over ? 'canvas-board-over' : '' }); // warning color, see styles.css
		if (sel) this.countEl.appendText(` · ${sel} selected`);
		this.countEl.setAttr('aria-label', (over ? `over ${max} · ` : '') + Object.entries(byColor).map(([c, k]) => `${c} ${k}`).join(' · '));
		this.countEl.setAttr('data-tooltip-position', 'top');
		this.countEl.show();
	}

	// The plugin folder holds the skill's default; the vault copy is written only when missing (then it is the
	// user's, plugin updates never overwrite it) or on "Reset agent skill" (`force`).
	skillPath() {
		return path.join(this.app.vault.adapter.basePath, '.claude', 'skills', 'canvas-board', 'SKILL.md');
	}

	syncSkill(dir, force = false) {
		const src = path.join(dir, 'skill', 'SKILL.md');
		const dest = this.skillPath();
		try {
			if (!force && fs.existsSync(dest)) return;
			fs.mkdirSync(path.dirname(dest), { recursive: true });
			fs.copyFileSync(src, dest);
			if (force) new Notice('Canvas board: agent skill reset to the plugin\'s version');
		} catch (e) {
			console.error('canvas-board: skill sync failed', e);
			if (force) new Notice(`Canvas board: skill reset failed (${e.message})`);
		}
	}

	// One undo step: the state before is pushed (unless the history already ends with it), then the edited data
	// is set, which pushes it, so Ctrl+Z and Ctrl+Y each take one step. `d` is passed when the caller already changed it (extract).
	edit(canvas, ops, d = canvas.getData()) {
		const before = canvas.getData();
		const retyped = this.cb.applyOps(d, ops);
		const h = canvas.history;
		const last = h && h.data && h.data[h.current];
		const same = x => JSON.stringify(x, (k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort()) : v); // key order aside
		if (canvas.pushHistory && (!last || same(last) !== same(before))) canvas.pushHistory(before);
		if (retyped.length) canvas.setData({ ...d, nodes: d.nodes.filter(n => !retyped.includes(n.id)) });
		canvas.setData(d); // pushes the new state
		canvas.requestSave(false); // without false it pushes it again a moment later: one more Ctrl+Z needed
	}

	activeFile() {
		const view = this.app.workspace.activeLeaf && this.app.workspace.activeLeaf.view;
		return view && view.file;
	}

	freePath(dir, name, ext) {
		for (let k = 1; ; k++) {
			const p = `${dir}${name}${k > 1 ? ' ' + k : ''}${ext}`;
			if (!this.app.vault.getAbstractFileByPath(p)) return p;
		}
	}

	// Cards (on any canvas) and notes that link `file`, except card `skipId` on `canvas`: [{ path, id?, label }].
	async subcanvasLinks(file, canvas, skipId) {
		const out = [];
		const here = this.canvasFile(canvas);
		const hits = from => target => { const f = this.app.metadataCache.getFirstLinkpathDest(target, from); return !!f && f.path === file.path; };
		for (const f of this.app.vault.getFiles().filter(f => f.extension === 'canvas' && f.path !== file.path)) {
			const open = f.path === here ? canvas : this.openCanvas(f.path);
			let d;
			try { d = open ? open.getData() : JSON.parse((await this.app.vault.cachedRead(f)) || '{}'); } catch (e) { continue; }
			for (const n of d.nodes || []) {
				if (f.path === here && n.id === skipId) continue;
				const hit = n.type === 'file' ? n.file === file.path : n.type === 'text' && this.cb.relinkText(n.text, hits(f.path), () => '\u0000') !== n.text;
				if (hit) out.push({ path: f.path, id: n.id, label: (n.text || n.file || '').split('\n')[0] });
			}
		}
		const resolved = this.app.metadataCache.resolvedLinks;
		for (const src in resolved) if (src !== file.path && !src.endsWith('.canvas') && resolved[src][file.path]) out.push({ path: src, label: src });
		return out;
	}

	canvasFile(canvas) {
		const leaf = this.app.workspace.getLeavesOfType('canvas').find(l => l.view.canvas === canvas);
		return leaf && leaf.view.file ? leaf.view.file.path : null;
	}

	// mode: dissolve (file to trash, other links break), copy (file kept), group (cards in a group named after the
	// file, other links redirected: cards on this board get an edge to the group, other cards and notes link this board).
	async unpack(canvas, node, file, mode, links = []) {
		const sub = JSON.parse((await this.app.vault.read(file)) || '{}');
		const content = JSON.stringify({ nodes: sub.nodes || [], edges: sub.edges || [] }, null, '\t');
		const label = (((node.getData().text || '').match(/\|([^\]]+)\]\]/) || [])[1] || file.basename).trim(); // the card's alias, else the file name
		const ops = this.cb.expandOps(canvas.getData(), node.id, { nodes: sub.nodes || [], edges: sub.edges || [] }, mode === 'group' ? { group: label } : {});
		const here = this.canvasFile(canvas);
		const isSub = from => target => { const f = this.app.metadataCache.getFirstLinkpathDest(target, from); return !!f && f.path === file.path; };
		if (mode === 'group') {
			const [a, b] = this.cb.SIDES[this.settings.layoutDirection] || this.cb.SIDES.TB;
			for (const l of links.filter(l => l.path === here)) {
				const n = canvas.getData().nodes.find(x => x.id === l.id);
				if (!n) continue;
				ops.push({ op: 'set', id: n.id, text: n.type === 'text' ? this.cb.relinkText(n.text, isSub(here), t => t) : label });
				ops.push({ op: 'edge', edge: { id: [...Array(16)].map(() => Math.floor(Math.random() * 16).toString(16)).join(''), fromNode: n.id, fromSide: a, toNode: ops.group, toSide: b } });
			}
		}
		this.edit(canvas, ops);
		if (mode === 'group') {
			const to = t => `[[${here}|${t}]]`;
			for (const p of [...new Set(links.filter(l => l.path !== here).map(l => l.path))]) {
				const f = this.app.vault.getAbstractFileByPath(p);
				if (!f) continue;
				if (p.endsWith('.canvas')) {
					const relink = d => { for (const n of d.nodes || []) {
						if (n.type === 'file' && n.file === file.path) n.file = here;
						else if (n.type === 'text') n.text = this.cb.relinkText(n.text, isSub(p), to);
					} };
					const open = this.openCanvas(p);
					if (open) { const d = open.getData(); relink(d); open.setData(d); open.requestSave(); }
					else await this.app.vault.process(f, t => { const d = JSON.parse(t || '{}'); relink(d); return JSON.stringify(d, null, '\t'); });
				} else await this.app.vault.process(f, t => this.cb.relinkText(t, isSub(p), to));
			}
		}
		if (mode !== 'copy') await this.app.fileManager.trashFile(file);
		const n = (sub.nodes || []).length, k = links.length, s = x => (x > 1 ? 's' : '');
		const what = {
			dissolve: `unpacked ${n} card${s(n)}, ${file.path} trashed` + (k ? ` (${k} link${s(k)} now broken)` : ''),
			copy: `unpacked ${n} card${s(n)}, ${file.path} kept`,
			group: `unpacked ${n} card${s(n)} into a group, ${k} link${s(k)} redirected`,
		}[mode];
		this.undoNotice(canvas, what, [], mode === 'copy' ? null : { path: file.path, content });
	}

	linkedCanvas(node) {
		const d = node.getData();
		const target = d.type === 'file' ? d.file : ((d.text || '').match(/\[\[([^\]|#]+\.canvas)/) || [])[1];
		if (!target || !target.endsWith('.canvas')) return null;
		return this.app.vault.getAbstractFileByPath(target) || this.app.metadataCache.getFirstLinkpathDest(target.trim(), '');
	}

	cardEditor(node) {
		const child = node.child;
		return child && ((child.editMode && child.editMode.editor) || child.editor) || null;
	}

	// Context of the note a card links (its `context:` list), so its archive note keeps the same context.
	cardContexts(node, board) {
		const d = node.getData();
		const target = d.type === 'file' ? d.file : ((d.text || '').match(/\[\[([^\]|#]+)/) || [])[1];
		const file = target && this.app.metadataCache.getFirstLinkpathDest(target.trim(), board);
		const fm = file && (this.app.metadataCache.getFileCache(file) || {}).frontmatter;
		const c = fm && fm.context ? [].concat(fm.context).map(String) : [];
		return c.length ? c : undefined;
	}

	async restore(note) {
		const src = await this.app.vault.read(note);
		const { board } = this.cb.restoreOps({ nodes: [], edges: [] }, src);
		const file = this.app.vault.getAbstractFileByPath(board) || this.app.metadataCache.getFirstLinkpathDest(board, note.path);
		if (!file) throw new Error(`board ${board} not found`);
		const canvas = this.openCanvas(file.path);
		if (canvas) this.edit(canvas, this.cb.restoreOps(canvas.getData(), src).ops);
		else await this.app.vault.process(file, text => {
			const d = JSON.parse(text);
			d.nodes = d.nodes || []; d.edges = d.edges || [];
			this.cb.applyOps(d, this.cb.restoreOps(d, src).ops);
			return JSON.stringify(d, null, '\t');
		});
		await this.app.fileManager.trashFile(note);
		new Notice(`Canvas board: card restored on ${file.path}`);
	}

	openCanvas(board) {
		const leaf = this.app.workspace.getLeavesOfType('canvas').find(l => l.view.file && l.view.file.path === board);
		return leaf ? leaf.view.canvas : null;
	}

	activeCanvas() {
		const view = this.app.workspace.activeLeaf && this.app.workspace.activeLeaf.view;
		return view && view.getViewType() === 'canvas' ? view.canvas : null;
	}

	// True if the board, or a plan canvas linked from one of its cards, has a card in `go` (setting "Workflow").
	async hasGoCards(board, go) {
		const read = async p => {
			const file = this.app.vault.getAbstractFileByPath(p);
			if (!file) return [];
			try { return JSON.parse(await this.app.vault.cachedRead(file)).nodes || []; } catch (e) { return []; }
		};
		const isGo = n => go.has(n.color);
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
		const claude = claudeBin(this.settings.claudePath);
		const view = this.app.workspace.activeLeaf && this.app.workspace.activeLeaf.view;
		const board = view && view.getViewType() === 'canvas' && view.file ? view.file.path : this.settings.defaultBoard;
		const go = parseColors(this.settings.passColors);
		if (!go.size) {
			new Notice(createFragment(f => {
				f.appendText('Canvas board: the agent did not start, no color triggers it. Turn one on in Settings > Workflow. ');
				const b = f.createEl('button', { cls: 'canvas-board-notice-undo', text: 'Open settings' });
				b.addEventListener('click', () => { this.app.setting.open(); this.app.setting.openTabById(this.manifest.id); });
			}), 10000);
			return;
		}
		if (!(await this.hasGoCards(board, go))) {
			const names = Object.keys(COLOR_NUM).filter(k => go.has(COLOR_NUM[k]));
			new Notice(`Canvas board: nothing to do on ${board} (no ${names.join(' or ')} card)`);
			return;
		}
		const vars = { vault, board, claude };
		const template = String(this.settings.terminal || '').trim();
		const launch = template
			? (([c, ...a]) => [c, a])((template.match(/"[^"]*"|\S+/g) || [])
				.map(a => a.replace(/^"|"$/g, '').replace(/\{(vault|board|claude)\}/g, (_, k) => vars[k])))
			: defaultLaunch(vars);
		if (!launch) {
			new Notice('Canvas board: no terminal found to start the pass. Set "Terminal command" in the plugin settings.', 10000);
			return;
		}
		const [cmd, cmdArgs] = launch;
		try {
			const child = spawn(cmd, cmdArgs, { cwd: vault, detached: true, stdio: 'ignore' });
			child.on('error', e => new Notice(`Canvas board: could not start the pass (${e.message})`));
			child.unref();
			new Notice(`Canvas board: pass started on ${board}`);
		} catch (e) {
			new Notice(`Canvas board: could not start the pass (${e.message})`);
		}
	}
};

// One-line name prompt; Enter confirms, Escape cancels. Options: `suggestions` (names listed as you type, Enter
// or click picks one into the field) and `overwrite` (name → true when it would replace a file: the button then
// reads "Overwrite", in the warning color).
// Unpack (dissolve) when other cards or notes link the subcanvas: group and redirect, keep the file, or break them.
class UnpackChoice extends Modal {
	constructor(app, file, links, onPick) {
		super(app);
		this.file = file;
		this.links = links;
		this.onPick = onPick;
	}

	onOpen() {
		const k = this.links.length;
		this.setTitle(`${this.file.basename} is linked from ${k} other place${k > 1 ? 's' : ''}`);
		const ul = this.contentEl.createEl('ul');
		for (const l of this.links.slice(0, 8)) ul.createEl('li', { text: l.id ? `${l.label} (${l.path})` : l.path });
		if (k > 8) ul.createEl('li', { text: `and ${k - 8} more` });
		const s = new Setting(this.contentEl);
		const pick = mode => { this.close(); this.onPick(mode); };
		s.addButton(b => b.setButtonText('Unpack into a group, redirect links').setCta().onClick(() => pick('group')));
		s.addButton(b => b.setButtonText('Keep the file (copy)').onClick(() => pick('copy')));
		s.addButton(b => b.setButtonText('Break links and trash').setWarning().onClick(() => pick('dissolve')));
		s.addButton(b => b.setButtonText('Cancel').onClick(() => this.close()));
	}

	onClose() {
		this.contentEl.empty();
	}
}

class NamePrompt extends Modal {
	constructor(app, title, onSubmit, opts = {}) {
		super(app);
		this.title = title;
		this.onSubmit = onSubmit;
		this.opts = opts;
	}

	onOpen() {
		this.setTitle(this.title);
		const { suggestions, overwrite } = this.opts;
		let value = '';
		let button, suggest, picked = false;
		const clean = v => v.trim().replace(/[\\/:#^|[\]]/g, '');
		// Subfolder names (a/b) are allowed for suggestions only: they name an existing file.
		const nameOf = v => suggestions && suggestions.some(s => s.toLowerCase() === v.trim().toLowerCase()) ? v.trim() : clean(v);
		const refresh = () => {
			if (!button) return;
			const over = !!(overwrite && value.trim() && overwrite(nameOf(value)));
			button.setButtonText(over ? 'Overwrite' : 'Create');
			button.buttonEl.toggleClass('mod-warning', over);
			button.buttonEl.toggleClass('mod-cta', !over);
		};
		const submit = () => {
			const name = nameOf(value);
			if (!name) return;
			this.close();
			Promise.resolve(this.onSubmit(name)).catch(e => new Notice(`Canvas board: ${e.message}`));
		};
		new Setting(this.contentEl).addText(t => {
			t.onChange(v => { value = v; refresh(); });
			if (suggestions && suggestions.length) suggest = new NameSuggest(this.app, t.inputEl, suggestions, v => {
				t.setValue(v); value = v; refresh();
				picked = true; setTimeout(() => { picked = false; }, 0); // the Enter that picked does not also submit
			});
			t.inputEl.addEventListener('keydown', e => {
				if (e.key !== 'Enter' || picked || (suggest && suggest.suggestEl && suggest.suggestEl.isConnected)) return;
				e.preventDefault();
				submit();
			});
			setTimeout(() => t.inputEl.focus(), 0);
		}).addButton(b => { button = b; b.setButtonText('Create').setCta().onClick(submit); });
	}

	onClose() {
		this.contentEl.empty();
	}
}

// Names under a text field that contain what is typed (all of them when it is empty); picking one calls `onPick`.
class NameSuggest extends AbstractInputSuggest {
	constructor(app, inputEl, names, onPick) {
		super(app, inputEl);
		this.names = names;
		this.onPick = onPick;
	}

	getSuggestions(q) {
		q = q.trim().toLowerCase();
		return this.names.filter(n => n.toLowerCase().includes(q)).sort((a, b) => a.localeCompare(b));
	}

	renderSuggestion(name, el) {
		el.setText(name);
		el.createSpan({ cls: 'canvas-board-key', text: 'overwrite' });
	}

	selectSuggestion(name) {
		this.onPick(name);
		this.close();
	}
}

// Fuzzy pick from `items` (shown by `label`); Enter calls `onChoose`.
class Picker extends FuzzySuggestModal {
	constructor(app, placeholder, items, label, onChoose) {
		super(app);
		this.setPlaceholder(placeholder);
		this.items = items;
		this.label = label;
		this.onChoose = onChoose;
	}

	getItems() { return this.items; }
	getItemText(item) { return this.label(item); }
	onChooseItem(item) { Promise.resolve(this.onChoose(item)).catch(e => new Notice(`Canvas board: ${e.message}`)); }
}

// Offsets of `query` in `text`, ignoring case.
function matchOffsets(text, query) {
	const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
	return Array.from(text.matchAll(re), m => m.index);
}

// Frames every `query` in the text under `root`, as search does in notes. A card being edited is left alone:
// CodeMirror owns its DOM. Returns the frames.
function frameText(root, query) {
	const doc = root.ownerDocument;
	const walker = doc.createTreeWalker(root, 4); // text nodes
	const texts = [];
	while (walker.nextNode()) texts.push(walker.currentNode);
	const frames = [];
	for (const node of texts) {
		if (node.parentElement.closest('.cm-editor, input, textarea')) continue;
		const here = [];
		// from the end, so the offsets before stay valid
		for (const at of matchOffsets(node.data, query).reverse()) {
			const hit = node.splitText(at);
			hit.splitText(query.length);
			const frame = doc.createElement('span');
			frame.className = 'canvas-board-find-text';
			hit.replaceWith(frame);
			frame.append(hit);
			here.unshift(frame);
		}
		frames.push(...here);
	}
	return frames;
}

function clearFrames(root) {
	for (const frame of root.querySelectorAll('.canvas-board-find-text')) {
		const parent = frame.parentNode;
		frame.replaceWith(...frame.childNodes);
		parent.normalize();
	}
}

// Find bar at the top of a canvas, built with the classes of the notes' find bar (document-search-*) so it looks
// the same: matches are the cards whose text (or file, link, group label) contains the query, ignoring case, in
// reading order (top to bottom, then left to right). Typing jumps to the first one; Enter / Shift+Enter or the
// arrows go to the next / previous (it wraps), Alt+Enter or the "all" button selects every match and zooms to them
// all, Escape or the cross closes. Every match is outlined, the current one selected and zoomed to (a hidden one
// clears filter and folds first). The text found is framed inside the cards, like search in notes; cards render when
// they come into view, so an observer frames them again while there are matches. Keys typed in the field never reach
// the canvas.
class FindBar {
	constructor(plugin, canvas) {
		this.plugin = plugin;
		this.canvas = canvas;
		this.matches = [];
		this.index = -1;
		this.framed = [];
		this.observer = new MutationObserver(() => {
			window.clearTimeout(this.frameTimer);
			this.frameTimer = window.setTimeout(() => this.frame(), 100);
		});
		const el = this.el = canvas.wrapperEl.createDiv({ cls: 'document-search-container canvas-board-find' });
		for (const ev of ['pointerdown', 'mousedown', 'wheel', 'dblclick', 'contextmenu']) el.addEventListener(ev, e => e.stopPropagation());
		const box = el.createDiv({ cls: 'document-search' });
		const field = this.field = box.createDiv({ cls: 'search-input-container document-search-input' });
		this.input = field.createEl('input', { type: 'search', attr: { placeholder: 'Find…', spellcheck: 'false' } });
		this.countEl = field.createDiv({ cls: 'document-search-count' }); // inside the field, as in notes (absolute)
		const buttons = box.createDiv({ cls: 'document-search-buttons' });
		const button = (icon, label, fn) => {
			const b = buttons.createEl('button', { cls: 'document-search-button clickable-icon', attr: { 'aria-label': label } });
			setIcon(b, icon);
			b.addEventListener('click', fn);
		};
		button('arrow-up', 'Previous (Shift+Enter)', () => this.step(-1));
		button('arrow-down', 'Next (Enter)', () => this.step(1));
		const all = buttons.createEl('button', { cls: 'document-search-button', text: 'All', attr: { 'aria-label': 'Select all matches (Alt+Enter)' } });
		all.addEventListener('click', () => this.selectAll());
		const close = box.createDiv({ cls: 'document-search-close-button clickable-icon', attr: { 'aria-label': 'Close (Escape)' } });
		setIcon(close, 'x');
		close.addEventListener('click', () => this.close());
		// Own key scope while the field has focus: canvas keys (Delete, arrows) stay off, global hotkeys still work.
		this.scope = new Scope(plugin.app.scope);
		this.input.addEventListener('keydown', e => {
			if (e.key === 'Enter' && e.altKey) { e.preventDefault(); this.selectAll(); }
			else if (e.key === 'Enter') { e.preventDefault(); this.step(e.shiftKey ? -1 : 1); }
			else if (e.key === 'Escape') { e.preventDefault(); this.close(); }
		});
		this.input.addEventListener('focus', () => plugin.app.keymap.pushScope(this.scope));
		this.input.addEventListener('blur', () => plugin.app.keymap.popScope(this.scope));
		this.input.addEventListener('input', () => this.search());
		el.hide();
	}

	open() {
		this.el.show();
		this.input.focus();
		this.input.select();
		if (this.input.value) this.search();
	}

	close() {
		this.mark([]);
		this.el.hide();
		this.input.blur();
	}

	search() {
		const q = this.input.value.trim().toLowerCase();
		const p = this.plugin;
		this.matches = !q ? [] : [...this.canvas.nodes.values()]
			.filter(n => p.cardText(n).toLowerCase().includes(q))
			.sort((a, b) => a.y - b.y || a.x - b.x);
		this.index = this.matches.length ? 0 : -1;
		this.mark(this.matches);
		this.show();
	}

	step(d) {
		if (!this.matches.length) return;
		this.index = (this.index + d + this.matches.length) % this.matches.length;
		this.show();
	}

	// Every match selected (so it can be moved, colored...) and in view; Enter goes back to one at a time.
	selectAll() {
		const { canvas, plugin, matches } = this;
		if (!matches.length) return;
		if (matches.some(n => plugin.isHidden(canvas, n))) { plugin.showAll(canvas); new Notice('Canvas board: filter and folds cleared to show the cards'); }
		for (const n of matches) n.nodeEl.addClass('is-current');
		canvas.updateSelection(() => { canvas.selection.clear(); for (const n of matches) canvas.selection.add(n); });
		canvas.zoomToSelection();
		this.countEl.setText(`all ${matches.length}`);
		this.input.focus();
	}

	mark(nodes) {
		for (const n of this.canvas.nodes.values()) n.nodeEl.removeClass('canvas-board-find-match', 'is-current');
		for (const n of nodes) n.nodeEl.addClass('canvas-board-find-match');
		this.frame(nodes);
	}

	// Frames the query in the given cards (default: the same ones again) and watches for cards rendering.
	frame(nodes = this.framed) {
		const root = n => n.contentEl || n.nodeEl; // not nodeEl when there is a choice: it also holds the fold badge
		this.observer.disconnect();
		for (const n of this.framed) clearFrames(root(n));
		this.framed = nodes;
		const q = this.input.value.trim();
		for (const n of nodes) {
			const frames = frameText(root(n), q);
			if (n === this.revealing && frames[0]) { this.reveal(frames[0]); this.revealing = null; }
		}
		if (nodes.length) this.observer.observe(this.canvas.wrapperEl, { childList: true, subtree: true });
	}

	// Scrolls a long card to its first match. By hand: scrollIntoView would also scroll the canvas itself.
	reveal(frame) {
		const box = frame.closest('.markdown-preview-view');
		if (!box) return;
		const at = frame.getBoundingClientRect(), view = box.getBoundingClientRect();
		const zoom = view.height / box.offsetHeight || 1; // on-screen sizes are scaled by the canvas zoom, scrollTop is not
		box.scrollTop += (at.top - view.top) / zoom - box.clientHeight / 2;
	}

	show() {
		const { canvas, plugin } = this;
		const q = this.input.value.trim();
		this.countEl.setText(!q ? '' : this.matches.length ? `${this.index + 1} / ${this.matches.length}` : 'No results');
		this.field.toggleClass('mod-no-match', !!q && !this.matches.length);
		const node = this.matches[this.index];
		if (!node) return;
		for (const n of this.matches) n.nodeEl.toggleClass('is-current', n === node);
		if (plugin.isHidden(canvas, node)) { plugin.showAll(canvas); new Notice('Canvas board: filter and folds cleared to show the card'); }
		canvas.selectOnly(node);
		canvas.zoomToSelection();
		this.revealing = node;
		this.frame();
		this.input.focus();
	}

	destroy() {
		this.mark([]);
		window.clearTimeout(this.frameTimer);
		this.plugin.app.keymap.popScope(this.scope);
		this.el.remove();
	}
}

// Filter pane in the top-left corner of a canvas, like Graph view's filters: closed, a filter button; open,
// one dot per color and one chip per tag on the canvas, all shown at first (click: hide, again: show), the
// folded cards, reset buttons and Show all. Every change applies at once. Shift-click on a color, tag or folded card
// adds its visible cards to the selection instead.
class FilterPane {
	constructor(plugin, canvas) {
		this.plugin = plugin;
		this.canvas = canvas;
		this.isOpen = false;
		this.key = '';
		const el = this.el = canvas.wrapperEl.createDiv({ cls: 'canvas-board-pane' });
		// Clicks and scrolls stay in the pane (no canvas pan, no deselect).
		for (const ev of ['pointerdown', 'mousedown', 'wheel', 'dblclick', 'contextmenu']) el.addEventListener(ev, e => e.stopPropagation());
		const head = el.createDiv({ cls: 'canvas-board-pane-head' });
		const btn = head.createDiv({ cls: 'clickable-icon', attr: { 'aria-label': plugin.keyedLabel('Filter cards', 'filter'), 'data-tooltip-position': 'right' } });
		setIcon(btn, 'filter');
		btn.addEventListener('click', () => this.toggle());
		this.badge = head.createSpan({ cls: 'canvas-board-pane-badge' });
		this.body = el.createDiv({ cls: 'canvas-board-pane-body' });
		const v = () => plugin.viewState(canvas);
		const apply = () => plugin.refreshView(canvas);

		const section = (title, reset) => {
			const s = this.body.createDiv({ cls: 'canvas-board-pane-section' });
			const h = s.createDiv({ cls: 'canvas-board-pane-heading' });
			h.createSpan({ text: title });
			if (reset) {
				const r = h.createSpan({ cls: 'clickable-icon canvas-board-pane-reset', attr: { 'aria-label': 'Reset' } });
				setIcon(r, 'rotate-ccw');
				r.addEventListener('click', () => { reset(); apply(); });
			}
			return s;
		};

		this.colorsEl = section('Colors', () => v().xcolors.clear()).createDiv({ cls: 'canvas-board-chips' });
		this.tagsSection = section('Tags', () => v().xtags.clear());
		this.tagsEl = this.tagsSection.createDiv({ cls: 'canvas-board-chips' });

		this.foldedSection = section('Folded', () => plugin.setFolds(canvas, new Map([...plugin.folds(canvas).keys()].map(id => [id, null]))));
		this.foldedEl = this.foldedSection.createDiv({ cls: 'canvas-board-pane-list' });

		const foot = this.body.createDiv({ cls: 'canvas-board-pane-foot' });
		const all = foot.createDiv({ cls: 'clickable-icon', attr: { 'aria-label': 'Unhide all (clear filter and folds)' } });
		setIcon(all, 'eye');
		all.addEventListener('click', () => plugin.showAll(canvas));
		this.toggle(false);
	}

	tags() {
		const tags = new Set();
		for (const node of this.canvas.nodes.values()) for (const t of this.plugin.cardTagSet(node)) tags.add(t);
		return tags;
	}

	toggle(open = !this.isOpen) {
		this.isOpen = open;
		this.el.toggleClass('is-open', open);
		this.key = '';
		this.update();
	}

	// Redraws the chips and lists only when something changed (called every 2 s), never the text fields.
	update() {
		const { plugin, canvas } = this;
		const v = plugin.viewState(canvas, false);
		const counts = {};
		for (const n of canvas.nodes.values()) { const d = n.getData(); if (d.type !== 'group') counts[d.color || ''] = (counts[d.color || ''] || 0) + 1; }
		const folds = plugin.folds(canvas);
		const active = plugin.filtering(v) || folds.size > 0;
		this.badge.setText(active ? plugin.viewLabel(canvas) : '');
		this.badge.toggle(!this.isOpen && active);
		if (!this.isOpen) return;
		const state = plugin.viewState(canvas);
		const tags = [...new Set([...this.tags(), ...state.xtags])].sort(); // a hidden tag stays listed, to show it again
		const foldedCards = [...folds.keys()].map(id => canvas.nodes.get(id)).filter(Boolean).map(n => [n.getData().color, plugin.cardText(n)]);
		const key = JSON.stringify([counts, [...state.xcolors], tags, [...state.xtags], [...folds], foldedCards, state.hidden.size]);
		if (key === this.key) return;
		this.key = key;
		const apply = () => plugin.refreshView(canvas);
		const toggle = (set, x) => { if (set.has(x)) set.delete(x); else set.add(x); apply(); };
		const select = keep => { if (!plugin.selectMore(canvas, [...canvas.selection], keep)) new Notice('Canvas board: no visible card to select'); };

		// Dots only, on one line; the name and card count are in the tooltip.
		this.colorsEl.empty();
		for (const [name, color] of COLORS) {
			const out = state.xcolors.has(color);
			const chip = this.colorsEl.createDiv({ cls: 'canvas-board-swatch', attr: { 'aria-label': `${plugin.colorLabel(name)} · ${counts[color] || 0} cards · click to ${out ? 'show' : 'hide'} · shift-click to select` } });
			chip.toggleClass('is-out', out);
			chip.createSpan({ cls: 'canvas-board-dot', attr: { style: color ? `background: var(--canvas-color-${color})` : '' } });
			chip.addEventListener('click', e => e.shiftKey ? select(n => (n.getData().color || '') === color) : toggle(state.xcolors, color));
		}

		this.tagsEl.empty();
		this.tagsSection.toggle(tags.length > 0);
		for (const t of tags) {
			const out = state.xtags.has(t);
			const chip = this.tagsEl.createDiv({ cls: 'canvas-board-chip', text: '#' + t, attr: { 'aria-label': `click to ${out ? 'show' : 'hide'} · shift-click to select` } });
			chip.toggleClass('is-out', out);
			chip.addEventListener('click', e => e.shiftKey ? select(n => plugin.cardTagSet(n).has(t)) : toggle(state.xtags, t));
		}

		this.foldedEl.empty();
		this.foldedSection.toggle(folds.size > 0);
		// Color dot, first line as title, the rest muted below, and how many cards the fold hides.
		for (const [id, dir] of folds) {
			const node = canvas.nodes.get(id);
			if (!node) continue;
			const row = this.foldedEl.createDiv({ cls: 'canvas-board-pane-row canvas-board-pane-card', attr: { 'aria-label': 'Click to unfold the whole branch · shift-click to select the card' } });
			row.createSpan({ cls: 'canvas-board-dot', attr: { style: plugin.dotStyle(node.getData().color) } });
			const text = row.createDiv({ cls: 'canvas-board-pane-card-text' });
			const [title, ...rest] = plugin.cb.plainLines(plugin.cardText(node));
			text.createDiv({ cls: 'canvas-board-pane-card-title', text: title || '(empty)' });
			if (rest.length) text.createDiv({ cls: 'canvas-board-pane-card-rest', text: rest.join(' · ') });
			row.createSpan({ cls: 'canvas-board-pane-card-count', text: `· ${plugin.branchLevels(canvas, id, dir).flat().length} folded` });
			row.addEventListener('click', e => e.shiftKey ? select(n => n.id === id) : plugin.unfold(canvas, [id], Infinity));
		}
	}

	destroy() {
		this.el.remove();
	}
}

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
		const heading = name => new Setting(containerEl).setName(name).setHeading();
		new Setting(containerEl).setName('Hotkeys').setDesc('Every canvas board command can have a key; buttons and menu items show it.').addButton(b => b
			.setButtonText('Open hotkeys')
			.onClick(() => {
				this.app.setting.openTabById('hotkeys');
				const tab = this.app.setting.activeTab;
				if (tab && tab.searchComponent) { tab.searchComponent.setValue('Canvas board'); if (tab.setQuery) tab.setQuery('Canvas board'); }
			}));
		heading('Board');
		new Setting(containerEl).setName('Starter board').setDesc('A board with the color legend and first steps: the default board if it does not exist yet, else "Starter board.canvas".').addButton(b => b
			.setButtonText('Create')
			.onClick(() => this.plugin.createStarterBoard()));
		text('Default board', 'Board used by "Run pass" when the active tab is not a canvas, and by "Open the board" (ribbon).', 'defaultBoard');
		text('Card count warning', 'The status bar card count turns to the warning color past this many cards (0: never).', 'cardWarning');
		text('Stale after (days)', 'A yellow card whose note is untouched this many days gets a warning badge with its age; the roll-up adds "· Nd" from the same value (0: never).', 'staleDays');
		text('Agent notes folder', 'Where the agent creates the notes and plan canvases for cards. Changing it does not move anything: rename the folder in Obsidian first, so links follow.', 'notesFolder');
		new Setting(containerEl).setName('Archive').setDesc('Where "Archive selected cards" puts the notes: a "<board> archive" folder next to each board, or one folder for all boards. Changing it does not move notes already archived; restore works from any folder.').addDropdown(dd => dd
			.addOption('board', 'Next to each board')
			.addOption('global', 'One folder for all boards')
			.setValue(this.plugin.settings.archiveMode)
			.onChange(async v => { this.plugin.settings.archiveMode = v; await this.plugin.saveData(this.plugin.settings); this.display(); }));
		if (this.plugin.settings.archiveMode === 'global') text('Archive folder', 'The folder for all boards\' archive notes.', 'archiveFolder');
		heading('Workflow').setDesc('What each color does and its label, shown in tooltips, the filter pane and the color commands. Toggle on: the color triggers the agent, so "Run pass" starts if the board has such a card and the agent takes those cards. All off: the agent never starts.');
		const go = parseColors(this.plugin.settings.passColors);
		for (const [name, meaning] of WORKFLOW) {
			const num = COLOR_NUM[name];
			const row = new Setting(containerEl).setName(num ? name : 'uncolored').setDesc(meaning);
			row.nameEl.prepend(createSpan({ cls: 'canvas-board-dot canvas-board-workflow-dot', attr: { style: this.plugin.dotStyle(num) } }));
			row.addText(t => t
				.setPlaceholder(COLORS.find(c => c[0] === name)[3])
				.setValue((this.plugin.settings.colorLabels || {})[name] || '')
				.onChange(v => this.plugin.setColorLabel(name, v.trim())));
			if (!num) row.addToggle(t => t // uncolored never triggers the agent: same pill for the layout, locked
				.setTooltip('Never triggers the agent')
				.setValue(false)
				.setDisabled(true));
			else row.addToggle(t => t
				.setTooltip('Triggers the agent')
				.setValue(go.has(num))
				.onChange(async on => {
					if (on) go.add(num); else go.delete(num);
					this.plugin.settings.passColors = WORKFLOW.map(([n]) => n).filter(n => go.has(COLOR_NUM[n])).join(' ');
					await this.plugin.saveData(this.plugin.settings);
				}));
		}
		heading('Pass');
		text('Claude path', 'Empty: ~/.local/bin/claude (claude.exe on Windows) if it exists, else claude on PATH.', 'claudePath');
		text('Terminal command', 'Starts the pass. Empty: Windows Terminal, macOS Terminal, or the first known terminal on Linux (gnome-terminal, konsole, xfce4-terminal, kitty, alacritty, wezterm, foot, xterm). Otherwise {vault}, {board}, {claude} are replaced; quote parts with spaces.', 'terminal');
		// The instructions the agent follows on a pass, edited here; the file stays where Claude Code finds the skill.
		const skillFile = this.plugin.skillPath();
		new Setting(containerEl).setName('Agent instructions').setDesc('What the agent does on a pass. Saved when the field loses focus, to .claude/skills/canvas-board/SKILL.md (where Claude Code reads it; any agent can be pointed at it). Written once from the plugin, then yours: plugin updates never overwrite it. Reset brings back the plugin\'s version.').addButton(b => b
			.setButtonText('Reset')
			.setWarning()
			.onClick(() => { this.plugin.syncSkill(path.join(this.app.vault.adapter.basePath, this.plugin.manifest.dir), true); this.display(); }));
		const editor = containerEl.createEl('textarea', { cls: 'canvas-board-skill-editor', attr: { spellcheck: 'false', rows: '24' } });
		try { editor.value = fs.readFileSync(skillFile, 'utf8'); } catch (e) { editor.placeholder = 'No instructions file yet: Reset writes the plugin\'s version.'; }
		editor.addEventListener('change', () => {
			try {
				fs.mkdirSync(path.dirname(skillFile), { recursive: true });
				fs.writeFileSync(skillFile, editor.value);
				new Notice('Canvas board: agent instructions saved');
			} catch (e) {
				new Notice(`Canvas board: could not save the agent instructions (${e.message})`);
			}
		});
		heading('APM counter').setDesc('Canvas cards touched in a rolling window, in the status bar while a canvas is the active tab.');
		const apm = this.plugin.apm;
		const a = apm.settings;
		new Setting(containerEl)
			.setName('Personal best')
			.setDesc(a.pb ? `${a.pb} cards in ${a.windowMinutes} min${a.pbDate ? `, set ${a.pbDate}` : ''}.` : 'None yet.')
			.addButton(b => b.setButtonText('Reset').setWarning().onClick(async () => { await apm.resetPb(); this.display(); }));
		new Setting(containerEl)
			.setName('Window (minutes)')
			.setDesc('Cards are counted over this rolling window. Changing it resets the personal best: the numbers are not comparable.')
			.addText(t => {
				t.setValue(String(a.windowMinutes));
				t.inputEl.addEventListener('change', async () => {
					const n = Number(t.getValue());
					if (!(n > 0) || n === a.windowMinutes) return;
					await apm.setWindow(n);
					this.display();
				});
			});
		new Setting(containerEl)
			.setName('Alert below')
			.setDesc('Percent of the personal best under which the counter turns red and pulses. Not in the first window of a session.')
			.addSlider(sl => sl.setLimits(5, 50, 5).setValue(a.lowPercent).setDynamicTooltip().onChange(async v => {
				a.lowPercent = v;
				await this.plugin.saveData(this.plugin.settings);
				apm.refresh();
			}));
		new Setting(containerEl)
			.setName('Idle after (minutes)')
			.setDesc('Without an action for this long, the alert stops and the counter dims. It also dims while Obsidian is not focused.')
			.addText(t => t.setValue(String(a.idleMinutes)).onChange(async v => {
				const n = Number(v);
				if (!(n > 0)) return;
				a.idleMinutes = n;
				await this.plugin.saveData(this.plugin.settings);
				apm.refresh();
			}));
		heading('Layout');
		new Setting(containerEl).setName('Layout direction').setDesc('Tidy layout and agent-made plan canvases: the card a branch starts from comes first, following arrows in the fold direction ("depends on" prerequisites too). Shift-click the Tidy layout button, or commands "Tidy layout direction: …", switch it on the fly.').addDropdown(dd => dd
			.addOptions({ TB: 'Top to bottom', LR: 'Left to right', BT: 'Bottom to top', RL: 'Right to left' })
			.setValue(this.plugin.settings.layoutDirection)
			.onChange(v => this.plugin.setLayoutDirection(v)));
		heading('View');
		new Setting(containerEl).setName('Fold direction').setDesc('Fold branch hides the cards the card points to (outgoing) or the cards pointing to it (incoming), and so on down the branch. Tidy layout reads branches the same way. Commands "Fold direction: …" switch it on the fly.').addDropdown(dd => dd
			.addOptions({ out: 'Outgoing', in: 'Incoming' })
			.setValue(this.plugin.settings.foldDirection)
			.onChange(async v => { this.plugin.settings.foldDirection = v; await this.plugin.saveData(this.plugin.settings); }));
		new Setting(containerEl).setName('Hide cards under hidden tags').setDesc('Hiding a tag in the filter pane also hides the branch of each card that has it, in the fold direction.').addToggle(t => t
			.setValue(this.plugin.settings.hideTagBranches)
			.onChange(async v => {
				this.plugin.settings.hideTagBranches = v;
				await this.plugin.saveData(this.plugin.settings);
				for (const canvas of this.plugin.panes.keys()) this.plugin.refreshView(canvas);
			}));
	}
}
