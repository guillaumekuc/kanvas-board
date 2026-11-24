---
name: kanvas-board
description: Run one agent pass over the planning canvas (the default board, or the one named, and the plan canvases it links): take every Do or Plan card up the ladder (wish → brief → plan → done), recolor it, roll statuses up and report what needs User. Use for "/kanvas-board", the Kanvas board pass prompt, "run a pass", "recheck the board", or when the Obsidian "Kanvas board: run pass" command opens a session.
argument-hint: "[board path, default: plugin setting \"Default board\"]"
---

# Kanvas board pass

This skill holds the steps. **The card color is the state**: notes carry no board fields. Colors are named by **role**, each one a fixed canvas color slot (the number cards store): Do `"5"`, Plan `"6"`, In Progress `"2"`, Review `"3"`, Blocked `"1"`, Done `"4"`. User picks the color each slot shows, so never go by what a color looks like; `--color` takes the role (`do`, `plan`, `inProgress`, `review`, `blocked`, `done`).

**Name the person "User"** in everything a pass writes (cards, notes, report), never by name.

**Never edit a `.canvas` file with Write/Edit/sed.** Every board change goes through `node .obsidian/plugins/kanvas-board/canvas.js` (it uses the plugin through the Obsidian CLI when the board is open, the file otherwise). Below, `canvas.js` means that command. This file is the vault note `{instructions}` (the pass prompt points every agent to a copy with the placeholders filled in, `pass-instructions.md` in the plugin folder), written from the plugin's `skill/SKILL.md` only when it is missing; after that it is yours to edit (in Obsidian, or Settings > Workflow > Agent instructions; command "Reset agent skill" restores the plugin's version; edit `skill/SKILL.md` to change the default for new vaults). Never move or resize cards you did not make; new cards go next to their parent (`add --near`).

**Placeholders** like `{notesFolder}`, `{noteTemplate}`, `{cardTemplate}` or `{working}` are filled in from Settings > Workflow when Run pass starts the agent; if you see them unfilled, `canvas.js workflow` prints their values. The card and plan-note templates are notes User edits: copy their shapes, leave out their `%% %%` comments; `check` holds what you write to them.

1. `node .obsidian/plugins/kanvas-board/canvas.js tree [board] --active`: the Do (`"5"`, go auto), Plan (`"6"`, go plan) and In Progress cards at any depth, the cards edged to them under `context` (read them, never change them), and the Review/Blocked count as `waiting`. **This is the pass's inventory: run it once, then set every Do and Plan card in it In Progress (`set <board> <id> --color {working}`) before working on any.** Only those cards are this pass's work: a card that turns Do or Plan later waits for User's next Run pass, even if the pass is still going.
2. For each card in the inventory, work by its level (`note.level` from `tree`: no note = wish, note without `- [ ]` parts = brief, with parts = plan). How far to take it: the card's role section below.
   - **wish → brief:** create `{notesFolder}/<Name>.md` from the plan-note template `{noteTemplate}` (never a folder written here; name says what it is, no context needed), with the template's frontmatter keys only (none if it has none): Overview (the aim, then its `**Done when:**` line) · Plan (the design) · Open questions as `- [?]` · Links & Resources for sources. Keep User's card wording in the brief. With questions: card text `[[Name]] · N questions`, Review.
   - **brief → plan:** fold User's `- [i]` answers into Plan, then move the answered questions with User's answers word for word to `## Decisions` (above Links & Resources, one `### Round N · YYYY-MM-DD` per round, newest on top, not collapsed); `## Open questions` keeps only what is still open. New questions on any later step go in Open questions the same way. List the parts as `- [ ]` checkboxes under Plan. If there are about 5+ parts with dependencies, also make `<Name>.canvas` next to the note: one short text card per part, "depends on" edges (`add`, `edge --label "depends on"`), then `layout <Name>.canvas --fit` (no hand placing), and link it from the card: `[[Name]] · [[Name.canvas|plan]] · review plan`. Plan: card Review `· review plan`.
   - **done** (every part ticked and done): fill the `**Output**:` line under Done when in Overview (links to what was made: SOP, script, note, branch); questions still in Open questions move word for word to a last round in Decisions (done settles them) and the empty section goes; card Done `[[Name]] · done · [[Output]]` (the main output; the rest stays in the note). A wish done with no note: card Done `<recap in a few words> · done · [[Output]]`, never User's full wording plus a done suffix.
   - Write a `> [!info] Since last time` callout at the top of the note body (replace the previous one): 1–3 lines on what changed.
3. `node .obsidian/plugins/kanvas-board/canvas.js rollup [board]`: parents take the most urgent nested role, `· N inside` and `· Nd` suffixes are refreshed. Then `node .obsidian/plugins/kanvas-board/canvas.js check [board] --ids <the inventory's ids and any card this pass added>` (read-only, never blocks the pass): it checks what the agent wrote, not what User did with cards afterwards.
4. Report: what each card became, then the Review/Blocked cards with links (or "nothing needs User"), then `check: N issues` with each one (or `check: clean`).

Each role has its section below: the agent reads them all; the plugin's Workflow toggles (`passColors` in `.obsidian/plugins/kanvas-board/data.json`) decide which roles `tree --active` returns as work.

## Do cards

Go auto. Keep stepping (every part counts as ticked) until a question, something only User can review, or done. A Do wish that is clear enough goes straight to work (no brief, no plan step).

- **plan → work:** all parts. Do what an agent can (vault edits, scripts; code following the vault's own rules for branches, never pushed unless User asks); anything for User goes in the note (Open questions or a `User:` part) and shows by the card's color, never in User's other notes. Tick parts, set finished sub-cards Done. Unticked parts left: Review `· review`. Questions on the way: Review `· N questions`.

## Plan cards

Go plan. One planning step (wish → brief, or brief → plan), then back to User; Plan never works parts. A Plan card already at plan level: User's new `- [i]` answers or edits mean the plan is not ready yet, so fold them in and refine it (Review `· review plan`); nothing new from User: Review `· set to Do to work`.

## In Progress cards

Another pass may still be running: leave it, list it in the report.

## Review cards

Waiting on User (a question or a review): never worked; counted in `waiting`, listed in the report with links.

## Blocked cards

Blocked: nothing moves until User unblocks it; counted in `waiting`, listed in the report with links.

## Done cards

Done: they stay until User removes them.

## Uncolored cards

Ideas or parked: never touched.
