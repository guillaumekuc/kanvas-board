# Kanvas board

Canvas + Kanban for [Obsidian](https://obsidian.md): a canvas becomes a board where **the card color is the state**, and an AI coding agent (Claude Code, Codex CLI, Gemini CLI, or any agent CLI that takes a prompt) takes the cards you color cyan or purple, writes a brief and a plan, does the work on cyan cards, and hands back what needs you in yellow.

Desktop only. Tested on Windows with Obsidian 1.14.5 and Claude Code. The macOS and Linux terminal launch and the other agents are written but untested: reports welcome.

## The colors

| Slot (default color) | Role (default label) | Meaning |
|---|---|---|
| cyan | Do | The agent carries the card to done. |
| purple | Plan | The agent takes one planning step (brief, then plan, then a refined plan), then hands back. It never does the work: color the card cyan for that. |
| orange | In Progress | A pass is on the card. |
| yellow | Review | A question or a review for you. |
| red | Blocked | Nothing moves until it is unblocked. |
| green | Done | Finished. Remove the card when it no longer helps. |
| uncolored | Inbox | An idea. The agent never touches it. |

The six roles are fixed, each with its rules in the plugin: In Progress is always taken by the next pass (and flagged when its note goes untouched for an hour); Blocked and Review wait on you (counted, they climb to parent cards, Blocked first; Review cards age); a parent whose cards are all Done turns Done; Do and Plan share the same rules and differ only by their agent instructions. Settings > Workflow lets you shape the rest:

- **Color** per role: each role keeps its canvas color slot for good (the number cards store, the Alt+N hotkey); click its dot to pick the color the slot shows, one of the six presets or a custom one. Every canvas in the vault, the canvas color picker and the plugin's dots follow; cards are never rewritten. Two roles may show the same color.
- **Label** and **toggle** per role: how it reads, and whether its color starts the agent.
- **Agent instructions** per role: what the agent does with those cards, including how it writes questions (`- [?]`), answers (`- [i]`) and the `## Decisions Record`. `tree` counts `- [?]` lines above `## Decisions Record` as open questions; a vault that wants other markers writes its own tooling.
- **Templates**: two notes in `<agent notes folder>/_templates/`, written the first time, then yours. `Card.md` lists the card text shapes agents write (`[[{note}]] · {reason}`, `{recap} · done · [[{output}]]`); `Plan note.md` holds the frontmatter keys and headings of their notes (a heading followed by `%% optional %%` or `%% when done %%` is not always required). `canvas.js check` reads both, so it checks what your workflow asks for.
- **Reset workflow** brings the defaults back.

## How a card moves

1. **Wish**: a card in your own words.
2. **Brief**: the agent writes a note (in the "Agent notes folder") with Aim, Design and open questions, links it from the card and turns it yellow.
3. **Plan**: you answer the questions in the note, color the card again; the agent lists the parts as checkboxes (and a plan canvas when there are many).
4. **Work** (cyan only): the agent does the parts, ticks them, and the card ends green with a link to what was made.

A cyan card that is clear enough skips the brief and the plan.

## Install

Not in the community plugin directory yet.

1. From the vault folder: `git clone https://github.com/guillaumekuc/kanvas-board .obsidian/plugins/kanvas-board` (update: `git pull` in that folder).
2. Settings > Community plugins: enable **Kanvas board**.
3. Command **Kanvas board: Create a starter board**: a board with the color legend and first steps.

### Requirements

- **An agent CLI** that takes a prompt: runs the pass. Default [Claude Code](https://docs.claude.com/en/docs/claude-code/setup), found at `~/.local/bin/claude` (`claude.exe` on Windows), else on PATH. Any other: set "Agent command", e.g. `codex`, `gemini -i {prompt}`, `opencode --prompt {prompt}` (`{prompt}` is replaced by the pass prompt, else it goes last).
- **Node.js** on PATH: the agent edits boards with `node .obsidian/plugins/kanvas-board/canvas.js`.
- **Obsidian CLI** (Settings > General > Command line interface, Obsidian 1.12+): lets `canvas.js` edit a board that is open without Obsidian saving over it. Without it, edits to open boards can be lost.
- A terminal: Windows Terminal, macOS Terminal, or on Linux one of gnome-terminal, konsole, xfce4-terminal, kitty, alacritty, wezterm, foot, xterm. Any other: set "Terminal command" (`{vault}` and `{board}` are replaced, `{agent}` becomes the agent command with its prompt).

## Run a pass

Command **Kanvas board: Run pass**: a terminal opens with the agent in the vault folder, prompted with "Run a Kanvas board pass on <board>: follow .obsidian/plugins/kanvas-board/pass-instructions.md" (the agent instructions with their placeholders filled in) for the active canvas (else the "Default board"). The agent first turns every card it takes orange, works, recolors them, then reports what needs you.

The agent's instructions are a vault note, `<notes folder>/_templates/Agent instructions.md` by default (path in Settings > Workflow), written from the plugin's `skill/SKILL.md` the first time (an older `agent-instructions.md` in the plugin folder is copied there instead); it is never overwritten after that, so edit it in Obsidian like any note. It has a general part, then one `## <Role> cards` section per role (`## Do cards`, `## In Progress cards`…, `## Uncolored cards` for none; older `## Cyan cards` headings still read as the slot's role): the agent reads them all, and the Workflow toggles decide which cards it works, so an untoggled color's section only tells it what those cards are. Settings > Workflow shows the general part and its "Reset" at the top, then each color's part under its label and toggle, all saved as that one file; fields fit their text; Reset brings back the plugin's version. The instructions can use `{notesFolder}`, `{noteTemplate}`, `{cardTemplate}`, `{instructions}`, `{working}`, `{done}`, `{blocked}` and `{review}` (the last four are role names, which `canvas.js set --color` takes, like the slots' color names): Run pass fills them in from Settings into `pass-instructions.md` (git-ignored) and points the agent there; `canvas.js workflow` prints the values, `canvas.js instructions` the filled text. `skill/SKILL.md` is also a valid [Agent Skill](https://agentskills.io): copy it into your agent's skills folder to run a pass by name.

## Board tools

All are commands (give them hotkeys), most also buttons or right-click items:

- Color selected cards (one command per color).
- Tidy layout of the selected cards (dagre), in four directions.
- Pack cards into a subcanvas and unpack it; merge, split (by paragraph, bullet, heading) and extract text.
- Fold and unfold branches; select children, same tag, same color.
- Search the current canvas; filter pane by color and tag.
- Archive cards to notes and restore them.
- Insert cards from a template (`.canvas` files in `Templates/Canvas/`).
- Status bar: card count, and an optional APM counter (cards touched in a rolling window).

## canvas.js

The command line the agent uses; also usable by hand from the vault root:

```
node .obsidian/plugins/kanvas-board/canvas.js tree [board] --active
node .obsidian/plugins/kanvas-board/canvas.js set <board> <id> --color cyan
node .obsidian/plugins/kanvas-board/canvas.js rollup [board]
node .obsidian/plugins/kanvas-board/canvas.js check [board]
```

Every command is listed at the top of `canvas.js`. When the board is open, edits go through the plugin (via `obsidian eval`), otherwise to the file.

## Obsidian internals

The canvas has no public API. The plugin uses undocumented parts of it (`canvas.getData/setData`, `requestSave`, the selection menu, the control bar, color picker classes, the hotkey manager). An Obsidian update may break the buttons; the commands are the stable part.

The plugin starts processes (`child_process`): the terminal for a pass, and `canvas.js` calls `obsidian eval` with code it builds from JSON-quoted values.

## Settings

| Setting | Default |
|---|---|
| Default board | `Board.canvas` |
| Agent notes folder | `Board notes` |
| Archive | a `<board> archive` folder next to each board, or one folder (`Board notes/Archive`) |
| Terminal command | empty: the platform's terminal |
| Agent command | empty: Claude Code (`~/.local/bin/claude`, else `claude`) |

No setting screen: `skipFolders` in `data.json` (folder names, e.g. `["private"]`) keeps `canvas.js` out of those folders when it looks up linked notes.

## License

MIT, see `LICENSE`.

## Credits

Layout by [dagre](https://github.com/dagrejs/dagre) (MIT, `dagre.LICENSE`).
