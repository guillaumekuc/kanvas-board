# Source layout

`src/` is ES modules (`src/package.json`): imports at the top of each file, no `require`. Files group by feature ("change together, stay together"): about 200–500 lines each, never past 1000 (style check `max-lines`). `npm run build` bundles `plugin/main.js` into `main.js` (loaded by Obsidian) and `cli/canvas.js` into `canvas.js` (run by the agent); both are committed, so the plugin folder works without a build.

- `board/`: read and edit canvas boards.
	- `store.js`: constants, settings (`data.json`), vault paths and the file index, reading and writing boards, the operation handlers and `applyOps` / `writeOps` (through the plugin's API when the board is open in Obsidian).
	- `geometry.js`: bounds, reading order, free spots, placement, dagre layout.
	- `refactor.js`: pack, unpack, extract, merge, split, relink, templates. The `*Ops` functions are pure: they return operations, which the CLI writes to the file and the plugin applies to the open canvas.
	- `notes.js`: card links, note contexts and names, `tree`, archive and restore.
- `workflow/`: the agent workflow on top of `board/`.
	- `workflow.js`: what a pass reads (`tree --active`, note level), the roll-up and the check. Go colors come from the plugin setting "Pass colors" (`data.json`).
	- `config.js`: the user's workflow (`workflow` in `data.json`, Settings > Workflow) over the defaults: the six fixed roles (`ROLES`, named after their default labels) and the color the user gave each, template paths, the built-in templates and the `{placeholders}` of the agent instructions. `resolve(settings)` is the one accessor.
	- `templateRules.js`: the card and plan-note templates turned into what `check` requires (card text shapes, frontmatter keys, required headings).
- `apm/apm.js`: the APM counter: canvas cards touched in a rolling window (default 15 min) in the status bar, colored against the personal best; shown only while a canvas is the active tab. An action is a card whose content or color changed on the open canvas; moving or resizing is not one. Pace counts distinct cards, so typing a sentence in one card counts once.
- `plugin/`: the Obsidian plugin.
	- `CanvasBoardPlugin.js`: load, commands plumbing, status bar, canvas decoration (header, controls, selection toolbar), templates, agent instructions file, edits, restore, Run pass.
	- `boardView.js`: per-canvas view state (filter, folds, tag branches, stale badges) and its painting, mixed into the plugin class.
	- `commands.js`: every command group, in right-click order. `view.js`: find bar, filter pane and their helpers. `unpack.js`: unpacking a nested canvas and relinking. `prompts.js`: name prompt and pickers. `pass.js`: launching the agent in a terminal. `starterBoard.js`: the starter board. `shared.js`: plugin constants, the board facade, the API, templates and APM start-up. `CanvasBoardSettings.js`: the settings screen.
	- On load it writes `skill/SKILL.md` to the instructions vault note (`workflow.instructions`, default `<notes folder>/_templates/Agent instructions.md`) when missing (from an older plugin-folder `agent-instructions.md` or `.claude/skills/<id>/SKILL.md` if there is one); after that that note is the user's, edited in Settings > Agent instructions (command "Reset agent skill"): a General field and one field per color, split and joined by `agentInstructions.js` on the `## <Color> cards` headings.
- `cli/`: the `canvas.js` command line (`canvas.js`, `commands.js`); its usage is `cli/usage.txt`, also the top of the built `canvas.js`.

Design patterns in use: Command (operation handlers in `board/store.js`, the `canvas.js` commands, plugin commands through `addCanvasCommand`), Facade (`boardLibrary` in `plugin/shared.js`), Singleton (`vaultFileIndex` in `board/store.js`), Mixin (`mixBoardView`, `plugin/boardView.js`), Observer (Obsidian events and the `MutationObserver` on the selection toolbar, `CanvasBoardPlugin.decorateSelectionToolbar`), Decorator (the canvas's own `menu.render`, `updateSelection` and `applyHistory` are wrapped to add behavior, `CanvasBoardPlugin.decorateSelectionToolbar` and `viewState`).

Checks: `npm run check` builds, runs the tests (`test/`: APM counter, terminal launch, golden output of `canvas.js` on a synthetic vault, plugin smoke test) and the style check (`eslint.config.js`, custom rules in `style/`).
