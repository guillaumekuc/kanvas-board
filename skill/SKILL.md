---
name: kanvas-board
description: Run one agent pass over the planning canvas (the default board, or the one named, and the plan canvases it links): take every cyan or purple card up the ladder (wish → brief → plan → done), recolor it, roll statuses up and report what needs User. Use for "/kanvas-board", the Kanvas board pass prompt, "run a pass", "recheck the board", or when the Obsidian "Kanvas board: run pass" command opens a session.
argument-hint: "[board path, default: plugin setting \"Default board\"]"
---

# Kanvas board pass

This skill holds the steps. **The card color is the state**: notes carry no board fields beyond `context`.

**Name the person "User"** in everything a pass writes (cards, notes, report), never by name.

**Never edit a `.canvas` file with Write/Edit/sed.** Every board change goes through `node .obsidian/plugins/kanvas-board/canvas.js` (it uses the plugin through the Obsidian CLI when the board is open, the file otherwise). Below, `canvas.js` means that command. This file is `.obsidian/plugins/kanvas-board/agent-instructions.md` (the pass prompt points every agent here), written from the plugin's `skill/SKILL.md` only when it is missing; after that it is yours to edit (Settings > Workflow > Agent instructions; command "Reset agent skill" restores the plugin's version; edit `skill/SKILL.md` to change the default for new vaults). Never move or resize cards you did not make; new cards go next to their parent (`add --near`).

**Placeholders** like `{notesFolder}`, `{noteTemplate}`, `{cardTemplate}` or `{working}` are filled in from Settings > Workflow when Run pass starts the agent; if you see them unfilled, `canvas.js workflow` prints their values. The card and plan-note templates are notes User edits: copy their shapes, leave out their `%% %%` comments; `check` holds what you write to them.

1. `node .obsidian/plugins/kanvas-board/canvas.js tree [board] --active`: the cyan (`"5"`, go auto), purple (`"6"`, go plan) and orange cards at any depth, the cards edged to them under `context` (read them, never change them), and the yellow/red count as `waiting`. **This is the pass's inventory: run it once, then set every cyan and purple card in it orange (`set <board> <id> --color orange`) before working on any.** Only those cards are this pass's work: a card that turns cyan or purple later waits for User's next Run pass, even if the pass is still going.
2. For each card in the inventory, work by its level (`note.level` from `tree`: no note = wish, note without `- [ ]` parts = brief, with parts = plan). How far to take it: the card's color section below.
   - **wish → brief:** create `{notesFolder}/<Name>.md` from the plan-note template `{noteTemplate}` (name says what it is, no context needed) with frontmatter `context` (a list with one value, e.g. `  - PD`) only, then Aim (ending with a `### Done when` subsection) · Design · Open questions as `- [?]`. Keep User's card wording in the brief. With questions: card text `[[Name]] · N questions`, yellow.
   - **brief → plan:** fold User's `- [i]` answers into Design, then move the answered questions with User's answers word for word to `## Decisions Record` (last section, one `### Round N · YYYY-MM-DD` per round, newest on top, not collapsed); `## Open questions` keeps only what is still open. New questions on any later step go in Open questions the same way. List the parts as `- [ ]` checkboxes. If there are about 5+ parts with dependencies, also make `<Name>.canvas` next to the note: one short text card per part, "depends on" edges (`add`, `edge --label "depends on"`), then `layout <Name>.canvas --fit` (no hand placing), and link it from the card: `[[Name]] · [[Name.canvas|plan]] · review plan`. Purple: card yellow `· review plan`.
   - **done** (every part ticked and done): add `## Output` right below Aim and its Done when (links to what was made: SOP, script, note, branch); questions still in Open questions move word for word to a last round in Decisions Record (done settles them) and the empty section goes; card green `[[Name]] · done · [[Output]]` (the main output; the rest stays in the note). A wish done with no note: card green `<recap in a few words> · done · [[Output]]`, never User's full wording plus a done suffix.
   - Write a `> [!info] Since last time` callout at the top of the note body (replace the previous one): 1–3 lines on what changed.
3. `node .obsidian/plugins/kanvas-board/canvas.js rollup [board]`: parents take the most urgent nested color, `· N inside` and `· Nd` suffixes are refreshed. Then `node .obsidian/plugins/kanvas-board/canvas.js check [board] --ids <the inventory's ids and any card this pass added>` (read-only, never blocks the pass): it checks what the agent wrote, not what User did with cards afterwards.
4. Report: what each card became, then the yellow/red cards with links (or "nothing needs User"), then `check: N issues` with each one (or `check: clean`).

Each color has its section below: the agent reads them all; the plugin's Workflow toggles (`passColors` in `.obsidian/plugins/kanvas-board/data.json`) decide which colors `tree --active` returns as work.

## Cyan cards

Go auto. Keep stepping (every part counts as ticked) until a question, something only User can review, or done. A cyan wish that is clear enough goes straight to work (no brief, no plan step).

- **plan → work:** all parts. Do what an agent can (vault edits, scripts; code following the vault's own rules for branches, never pushed unless User asks); anything for User goes in the note (Open questions or a `User:` part) and shows by the card's color, never in User's other notes. Tick parts, set finished sub-cards green. Unticked parts left: yellow `· review`. Questions on the way: yellow `· N questions`.

## Purple cards

Go plan. One planning step (wish → brief, or brief → plan), then back to User; purple never works parts. A purple card already at plan level: User's new `- [i]` answers or edits mean the plan is not ready yet, so fold them in and refine it (yellow `· review plan`); nothing new from User: yellow `· color cyan to work`.

## Orange cards

Another pass may still be running: leave it, list it in the report.

## Yellow cards

Waiting on User (a question or a review): never worked; counted in `waiting`, listed in the report with links.

## Red cards

Blocked: nothing moves until User unblocks it; counted in `waiting`, listed in the report with links.

## Green cards

Done: they stay until User removes them.

## Uncolored cards

Ideas or parked: never touched.
