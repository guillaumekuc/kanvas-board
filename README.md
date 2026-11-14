# Kanvas board

Canvas + Kanban for [Obsidian](https://obsidian.md): a canvas becomes a board where **the card color is the state**, and an AI coding agent (Claude Code, Codex CLI, Gemini CLI, or any agent CLI that takes a prompt) takes the cards you color cyan or purple, writes a brief and a plan, does the work on cyan cards, and hands back what needs you in yellow.

Desktop only. Tested on Windows with Obsidian 1.14.5 and Claude Code. The macOS and Linux terminal launch and the other agents are written but untested: reports welcome.

## The colors

| Color | Default label | Meaning |
|---|---|---|
| cyan | Do | The agent carries the card to done. |
| purple | Clarify | The agent takes one planning step (brief, then plan, then a refined plan), then hands back. It never does the work: color the card cyan for that. |
| orange | In Progress | A pass is on the card. |
| yellow | Review | A question or a review for you. |
| red | Blocked | Nothing moves until it is unblocked. |
| green | Done | Finished. Remove the card when it no longer helps. |
| uncolored | Inbox | An idea. The agent never touches it. |

Labels and which colors start the agent: Settings > Workflow.

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

Command **Kanvas board: Run pass**: a terminal opens with the agent in the vault folder, prompted with "Run a Kanvas board pass on <board>: follow .obsidian/plugins/kanvas-board/agent-instructions.md" for the active canvas (else the "Default board"). The agent first turns every card it takes orange, works, recolors them, then reports what needs you.

The agent's instructions are `agent-instructions.md` in the plugin folder, written from the plugin's `skill/SKILL.md` the first time (git-ignored, so `git pull` never overwrites it). Read and edit it in Settings > Agent instructions; "Reset" brings back the plugin's version. `skill/SKILL.md` is also a valid [Agent Skill](https://agentskills.io): copy it into your agent's skills folder to run a pass by name.

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
