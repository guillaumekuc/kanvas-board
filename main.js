// Canvas board: color hotkeys for selected canvas cards, a command that opens a terminal running the
// canvas-board skill (Claude Code) on the vault, and an API that canvas.js calls (through `obsidian eval`)
// to edit open boards, a "Tidy layout" command (dagre, through canvas.js), refactor commands (collapse, expand, merge,
// split, extract), archive/restore, view tools (search and jump, find bar, filter pane, fold), card templates and a status bar card count. Copies skill/SKILL.md to
// .claude/skills/canvas-board/ on load.
// See Wiki/G&A/PKM/SOP - Canvas Board.md.
const { Plugin, Notice, PluginSettingTab, Setting, Modal, FuzzySuggestModal, Scope, setIcon } = require('obsidian');
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
	hideTagBranches: true, // a hidden tag also hides the cards below its cards (in the fold direction)
	foldDirection: 'out', // fold hides the cards a card points to (out) or the cards pointing to it (in)
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
		const cb = req(script);
		const { applyOps, layoutOps } = cb;
		this.cb = cb;
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

		// Refactor and archive commands: one undo step each (Ctrl+Z), same code as canvas.js for agents.
		// Each is also a right-click item (label `menu`) on the cards it applies to.
		// `menu` is [title, Lucide icon], or null for a command with no menu item.
		const actions = [];
		const runAction = (run, canvas, sel) => Promise.resolve(run(canvas, sel)).catch(e => new Notice(`Canvas board: ${e.message}`));
		const canvasCommand = (id, name, menu, test, run) => {
			if (menu) actions.push({ menu, test, run });
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

		canvasCommand('collapse', 'Collapse selected cards into a subcanvas', ['Collapse into a subcanvas', 'fold-vertical'], (c, sel) => sel.length > 0, (canvas, sel) =>
			new NamePrompt(this.app, 'Subcanvas name', async name => {
				const board = this.activeFile();
				const dir = board.parent && board.parent.path !== '/' ? board.parent.path + '/' : '';
				const file = this.freePath(dir, name, '.canvas');
				const { ops, sub } = cb.collapseOps(canvas.getData(), sel.map(n => n.id), file, name);
				await this.app.vault.create(file, JSON.stringify(sub, null, '\t'));
				this.edit(canvas, ops);
			}).open());

		canvasCommand('expand', 'Expand subcanvas card', ['Expand subcanvas', 'unfold-vertical'], (c, sel) => sel.length === 1 && !!this.linkedCanvas(sel[0]), async (canvas, [node]) => {
			const file = this.linkedCanvas(node);
			const sub = JSON.parse(await this.app.vault.read(file));
			this.edit(canvas, cb.expandOps(canvas.getData(), node.id, { nodes: sub.nodes || [], edges: sub.edges || [] }));
			await this.app.fileManager.trashFile(file);
		});

		canvasCommand('merge', 'Merge selected cards', ['Merge cards', 'merge'], (c, sel) => sel.length > 1 && sel.every(isText), (canvas, sel) =>
			this.edit(canvas, cb.mergeOps(canvas.getData(), sel.map(n => n.id))));

		// Only the top-level split is a menu item; the others stay commands.
		for (const [by, label] of [['paragraph', 'paragraph'], ['bullet', 'top-level bullet'], ['h1', 'heading 1'], ['h2', 'heading 2'], ['h3', 'heading 3']])
			canvasCommand(`split-${by}`, `Split card by ${label}`, by === 'bullet' ? ['Split by top-level bullet', 'split'] : null, (c, sel) => sel.length === 1 && isText(sel[0]) && !sel[0].isEditing, (canvas, [node]) =>
				this.edit(canvas, cb.splitOps(canvas.getData(), node.id, by)));

		// The card being edited, with text selected: the selection becomes a new card.
		canvasCommand('extract', 'Extract selection to a new card', ['Extract selection to a new card', 'text-select'], (c, sel) => sel.length === 1 && sel[0].isEditing && !!this.cardEditor(sel[0]), (canvas, [node]) => {
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
			if (!this.app.vault.getAbstractFileByPath(cb.ARCHIVE_DIR)) await this.app.vault.createFolder(cb.ARCHIVE_DIR);
			for (const node of sel) {
				const a = cb.archiveNote(d, node.id, board, window.moment().format('YYYY-MM-DD'), this.cardContexts(node, board));
				await this.app.vault.create(this.freePath(cb.ARCHIVE_DIR + '/', a.name, '.md'), a.content);
			}
			this.edit(canvas, sel.map(n => ({ op: 'remove', id: n.id })));
			new Notice(`Canvas board: archived ${sel.length} card${sel.length > 1 ? 's' : ''}`);
		});

		// Fold hides the cards linked to a card, following edges in the "Fold direction" setting (out: the cards it
		// points to, then on; in: the cards pointing to it, then on). Unfold shows N levels again and folds the cards
		// at level N, so a branch opens in stages, like folders. Folds are stored on the card (see foldOf), so Ctrl+Z
		// undoes them. With several cards selected, each one that can be folded (or unfolded) is.
		const canFold = (c, n) => !this.foldOf(n) && this.branchLinks(c, this.settings.foldDirection).has(n.id);
		canvasCommand('fold', 'Fold branch of the selected cards', ['Fold branch', 'chevrons-down-up'], (c, sel) => sel.some(n => canFold(c, n)), (canvas, sel) =>
			this.setFolds(canvas, new Map(sel.filter(n => canFold(canvas, n)).map(n => [n.id, this.settings.foldDirection]))));
		for (const [levels, id, name, menu] of [[1, 'unfold', 'Unfold one level of the selected cards', ['Unfold one level', 'chevron-down']],
			[2, 'unfold-2', 'Unfold two levels of the selected cards', null], [3, 'unfold-3', 'Unfold three levels of the selected cards', null],
			[Infinity, 'unfold-all', 'Unfold the whole branch of the selected cards', ['Unfold whole branch', 'chevrons-up-down']]])
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

		// Templates: the selection (and edges between its cards) as Templates/Canvas/<name>.canvas.
		canvasCommand('template-save', 'Save selected cards as a template', ['Save as template', 'layout-template'], (c, sel) => sel.length > 0, canvas =>
			new NamePrompt(this.app, 'Template name', async name => {
				const { nodes, edges } = canvas.getSelectionData();
				if (!this.app.vault.getAbstractFileByPath(cb.TEMPLATE_DIR)) await this.app.vault.createFolder(cb.TEMPLATE_DIR);
				const file = this.freePath(cb.TEMPLATE_DIR + '/', name, '.canvas');
				await this.app.vault.create(file, JSON.stringify({ nodes, edges }, null, '\t'));
				new Notice(`Canvas board: template saved to ${file}`);
			}).open());
		this.addCommand({
			id: 'template-insert',
			name: 'New cards from template',
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

		// Search and jump, filter: the active canvas only. Filter and folds hide cards (styles.css). The filter is
		// view only (the file is untouched, it resets when the board is reopened); folds are in the file.
		this.views = new WeakMap(); // canvas → { xcolors, xtags (hidden colors and tags), hidden (card ids) }
		this.panes = new Map(); // canvas → FilterPane, one per open canvas
		this.addCommand({
			id: 'search',
			name: 'Search cards and jump',
			checkCallback: checking => {
				const canvas = this.activeCanvas();
				if (!canvas) return false;
				if (!checking) new Picker(this.app, 'Card', [...canvas.nodes.values()], n => this.cardLabel(n), n => {
					if (this.isHidden(canvas, n)) { this.showAll(canvas); new Notice('Canvas board: filter and folds cleared to show the card'); }
					canvas.selectOnly(n);
					canvas.zoomToSelection();
				}).open();
				return true;
			},
		});
		// Prototype next to "Search cards and jump": a find bar like the one in notes (count, previous / next).
		this.finds = new Map(); // canvas → FindBar
		this.addCommand({
			id: 'find',
			name: 'Find in canvas (count, previous / next)',
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
			name: 'Filter cards by color or tag (open or close the filter pane)',
			checkCallback: checking => {
				const canvas = this.activeCanvas();
				if (!canvas) return false;
				if (!checking) this.pane(canvas).toggle();
				return true;
			},
		});
		this.addCommand({
			id: 'show-all',
			name: 'Show all cards (clear filter and folds)',
			checkCallback: checking => {
				const canvas = this.activeCanvas();
				if (!canvas || !this.viewLabel(canvas)) return false;
				if (!checking) this.showAll(canvas);
				return true;
			},
		});

		// Right-click on one card, on a selection, or inside a card being edited (Extract).
		const addActions = (menu, canvas, sel) => {
			for (const a of actions) if (a.test(canvas, sel))
				menu.addItem(item => item.setTitle(a.menu[0]).setIcon(a.menu[1]).setSection('canvas-board').onClick(() => runAction(a.run, canvas, sel)));
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
				if (!this.views.has(canvas)) continue;
				delete canvas.updateSelection;
				delete canvas.applyHistory;
				this.paint(canvas, new Set(), new Map()); // folds stay in the file, only the screen is cleared
			}
		});
	}

	// Filter state of an open canvas. `create` false only reads (an empty state, not stored).
	viewState(canvas, create = true) {
		const empty = () => ({ xcolors: new Set(), xtags: new Set(), hidden: new Set() });
		let v = this.views.get(canvas);
		if (v || !create) return v || empty();
		v = empty();
		this.views.set(canvas, v);
		// Hidden cards never stay selected (select all, drag to select), so Delete never hits a card you can't see.
		const orig = canvas.updateSelection;
		canvas.updateSelection = function (fn) {
			return orig.call(this, () => {
				fn();
				for (const x of [...this.selection]) if (v.hidden.has(x.id) || (x.from && (v.hidden.has(x.from.node.id) || v.hidden.has(x.to.node.id)))) this.selection.delete(x);
			});
		};
		// Undo / redo may bring folds back or take them away: redraw at once.
		const plugin = this;
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

	// Hides the `hidden` cards and their edges; `folded` (id → count) gets the "· N folded" badge.
	paint(canvas, hidden, folded) {
		for (const node of canvas.nodes.values()) {
			node.nodeEl.toggleClass('canvas-board-hidden', hidden.has(node.id));
			if (folded.has(node.id)) node.nodeEl.setAttr('data-canvas-board-folded', `· ${folded.get(node.id)} folded`);
			else node.nodeEl.removeAttribute('data-canvas-board-folded');
		}
		for (const e of canvas.edges.values()) {
			const off = hidden.has(e.from.node.id) || hidden.has(e.to.node.id);
			for (const el of [e.lineGroupEl, e.lineEndGroupEl, e.labelElement && e.labelElement.wrapperEl]) if (el) el.classList.toggle('canvas-board-hidden', off);
		}
	}

	viewLabel(canvas) {
		const v = this.viewState(canvas, false);
		const names = Object.fromEntries(COLORS.map(([label, color]) => [color, label.split(' ')[0]]));
		const filter = [...v.xcolors].map(c => names[c] || c).concat([...v.xtags].map(t => '#' + t));
		const parts = [];
		if (filter.length) parts.push(`hidden: ${filter.join(', ')}`);
		const folds = this.folds(canvas).size;
		if (folds) parts.push(`${folds} folded`);
		return parts.join(' · ');
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

	cardLabel(node) {
		return (this.cardText(node) || '(empty)').replace(/\s+/g, ' ').trim().slice(0, 200);
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
		this.countEl.setText(`${cards.length} cards`);
		this.countEl.toggleClass('canvas-board-over', over); // warning color, see styles.css
		this.countEl.setAttr('aria-label', (over ? `over ${max} · ` : '') + Object.entries(byColor).map(([c, k]) => `${c} ${k}`).join(' · '));
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

// One-line name prompt; Enter confirms, Escape cancels.
class NamePrompt extends Modal {
	constructor(app, title, onSubmit) {
		super(app);
		this.title = title;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		this.setTitle(this.title);
		let value = '';
		const submit = () => {
			const name = value.trim().replace(/[\\/:#^|[\]]/g, '');
			if (!name) return;
			this.close();
			Promise.resolve(this.onSubmit(name)).catch(e => new Notice(`Canvas board: ${e.message}`));
		};
		new Setting(this.contentEl).addText(t => {
			t.onChange(v => { value = v; });
			t.inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
			setTimeout(() => t.inputEl.focus(), 0);
		}).addButton(b => b.setButtonText('Create').setCta().onClick(submit));
	}

	onClose() {
		this.contentEl.empty();
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

// Find bar at the top of a canvas, built with the classes of the notes' find bar (document-search-*) so it looks
// the same: matches are the cards whose text (or file, link, group label) contains the query, ignoring case, in
// reading order (top to bottom, then left to right). Typing jumps to the first one; Enter / Shift+Enter or the
// arrows go to the next / previous (it wraps), Escape or the cross closes. Every match is outlined, the current one
// selected and zoomed to (a hidden one clears filter and folds first). Keys typed in the field never reach the canvas.
class FindBar {
	constructor(plugin, canvas) {
		this.plugin = plugin;
		this.canvas = canvas;
		this.matches = [];
		this.index = -1;
		const el = this.el = canvas.wrapperEl.createDiv({ cls: 'document-search-container canvas-board-find' });
		for (const ev of ['pointerdown', 'mousedown', 'wheel', 'dblclick', 'contextmenu']) el.addEventListener(ev, e => e.stopPropagation());
		const box = el.createDiv({ cls: 'document-search' });
		const field = box.createDiv({ cls: 'search-input-container document-search-input' });
		this.input = field.createEl('input', { type: 'search', attr: { placeholder: 'Find…', spellcheck: 'false' } });
		this.countEl = box.createDiv({ cls: 'document-search-count' });
		const buttons = box.createDiv({ cls: 'document-search-buttons' });
		const button = (icon, label, fn) => {
			const b = buttons.createEl('button', { cls: 'document-search-button clickable-icon', attr: { 'aria-label': label } });
			setIcon(b, icon);
			b.addEventListener('click', fn);
		};
		button('arrow-up', 'Previous (Shift+Enter)', () => this.step(-1));
		button('arrow-down', 'Next (Enter)', () => this.step(1));
		const close = box.createDiv({ cls: 'document-search-close-button clickable-icon', attr: { 'aria-label': 'Close (Escape)' } });
		setIcon(close, 'x');
		close.addEventListener('click', () => this.close());
		// Own key scope while the field has focus: canvas keys (Delete, arrows) stay off, global hotkeys still work.
		this.scope = new Scope(plugin.app.scope);
		this.input.addEventListener('keydown', e => {
			if (e.key === 'Enter') { e.preventDefault(); this.step(e.shiftKey ? -1 : 1); }
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

	mark(nodes) {
		for (const n of this.canvas.nodes.values()) n.nodeEl.removeClass('canvas-board-find-match', 'is-current');
		for (const n of nodes) n.nodeEl.addClass('canvas-board-find-match');
	}

	show() {
		const { canvas, plugin } = this;
		const q = this.input.value.trim();
		this.countEl.setText(!q ? '' : this.matches.length ? `${this.index + 1} / ${this.matches.length}` : 'No results');
		const node = this.matches[this.index];
		if (!node) return;
		for (const n of this.matches) n.nodeEl.toggleClass('is-current', n === node);
		if (plugin.isHidden(canvas, node)) { plugin.showAll(canvas); new Notice('Canvas board: filter and folds cleared to show the card'); }
		canvas.selectOnly(node);
		canvas.zoomToSelection();
		this.input.focus();
	}

	destroy() {
		this.mark([]);
		this.plugin.app.keymap.popScope(this.scope);
		this.el.remove();
	}
}

// Filter pane in the top-left corner of a canvas, like Graph view's filters: closed, a filter button; open,
// one dot per color and one chip per tag on the canvas, all shown at first (click: hide, again: show), the
// folded cards, reset buttons and Show all. Every change applies at once.
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
		const btn = head.createDiv({ cls: 'clickable-icon', attr: { 'aria-label': 'Filter cards', 'data-tooltip-position': 'right' } });
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
		const all = foot.createDiv({ cls: 'clickable-icon', attr: { 'aria-label': 'Show all (clear filter and folds)' } });
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
		const key = JSON.stringify([counts, [...state.xcolors], tags, [...state.xtags], [...folds], state.hidden.size]);
		if (key === this.key) return;
		this.key = key;
		const apply = () => plugin.refreshView(canvas);
		const toggle = (set, x) => { if (set.has(x)) set.delete(x); else set.add(x); apply(); };

		// Dots only, on one line; the name and card count are in the tooltip.
		this.colorsEl.empty();
		for (const [label, color] of COLORS) {
			const out = state.xcolors.has(color);
			const chip = this.colorsEl.createDiv({ cls: 'canvas-board-swatch', attr: { 'aria-label': `${label.split(' ')[0]} · ${counts[color] || 0} cards · click to ${out ? 'show' : 'hide'}` } });
			chip.toggleClass('is-out', out);
			chip.createSpan({ cls: 'canvas-board-dot', attr: { style: color ? `background: var(--canvas-color-${color})` : '' } });
			chip.addEventListener('click', () => toggle(state.xcolors, color));
		}

		this.tagsEl.empty();
		this.tagsSection.toggle(tags.length > 0);
		for (const t of tags) {
			const out = state.xtags.has(t);
			const chip = this.tagsEl.createDiv({ cls: 'canvas-board-chip', text: '#' + t, attr: { 'aria-label': `click to ${out ? 'show' : 'hide'}` } });
			chip.toggleClass('is-out', out);
			chip.addEventListener('click', () => toggle(state.xtags, t));
		}

		this.foldedEl.empty();
		this.foldedSection.toggle(folds.size > 0);
		for (const id of folds.keys()) {
			const node = canvas.nodes.get(id);
			if (!node) continue;
			const row = this.foldedEl.createDiv({ cls: 'canvas-board-pane-row', text: plugin.cardLabel(node).slice(0, 60), attr: { 'aria-label': 'Click to unfold the whole branch' } });
			row.addEventListener('click', () => plugin.unfold(canvas, [id], Infinity));
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
		text('Default board', 'Board used by "Run pass" when the active tab is not a canvas.', 'defaultBoard');
		text('Claude path', 'Empty: ~/.local/bin/claude.exe if it exists, else claude on PATH.', 'claudePath');
		new Setting(containerEl).setName('Layout direction').setDesc('Tidy layout and agent-made plan canvases: top to bottom or left to right ("depends on" prerequisites come first).').addDropdown(dd => dd
			.addOptions({ TB: 'Top to bottom', LR: 'Left to right' })
			.setValue(this.plugin.settings.layoutDirection)
			.onChange(async v => { this.plugin.settings.layoutDirection = v; await this.plugin.saveData(this.plugin.settings); }));
		new Setting(containerEl).setName('Fold direction').setDesc('Fold branch hides the cards the card points to (outgoing) or the cards pointing to it (incoming), and so on down the branch. Commands "Fold direction: …" switch it on the fly.').addDropdown(dd => dd
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
		text('Card count warning', 'The status bar card count turns to the warning color past this many cards (0: never).', 'cardWarning');
		text('Terminal command', 'Starts the pass. {vault}, {board}, {claude} are replaced; quote parts with spaces.', 'terminal');
	}
}
