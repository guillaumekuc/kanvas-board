---
name: canvas-board
description: Run one agent pass over the planning canvas (Plans.canvas and the plan canvases it links): take every cyan or purple card up the ladder (wish → brief → plan → done), recolor it, roll statuses up and report what needs Guillaume. Use for "/canvas-board", "run a pass", "recheck the board", "check Plans.canvas", or when the Obsidian "Canvas board: run pass" command opens a session.
argument-hint: "[board path, default Plans.canvas]"
---

# Canvas board pass

This skill holds the steps; read `Wiki/G&A/PKM/SOP - Canvas Board.md` only for an edge case it does not cover. **The card color is the state**: notes carry no board fields beyond `context`.

**Never edit a `.canvas` file with Write/Edit/sed.** Every board change goes through `node .obsidian/plugins/canvas-board/canvas.js` (it uses the plugin through the Obsidian CLI when the board is open, the file otherwise). Below, `canvas.js` means that command. This file's source is `.obsidian/plugins/canvas-board/skill/SKILL.md`: edit it there, the plugin copies it here on load. Never move or resize cards you did not make; new cards go next to their parent (`add --near`).

1. `node .obsidian/plugins/canvas-board/canvas.js tree [board] --active`: the cyan (`"5"`, go auto), purple (`"6"`, go plan) and orange cards at any depth (orange = another pass may still be running: leave it, list it in the report), the cards edged to them under `context` (read them, never change them), and the yellow/red count as `waiting`.
2. For each card, set it orange (`set <board> <id> --color orange`), then work by its level (`note.level` from `tree`: no note = wish, note without `- [ ]` parts = brief, with parts = plan). **Purple:** one step, then back to Guillaume. **Cyan:** keep stepping (every part counts as ticked) until a question, something only he can review, or done. A cyan wish that is clear enough goes straight to work (no brief, no plan step).
   - **wish → brief:** create `Projects/_assets/plans/<Name>.md` (name says what it is, no context needed) with frontmatter `context` (a list with one value, e.g. `  - PD`) only, then Aim (ending with a `### Done when` subsection) · Design · Open questions as `- [?]`. Keep Guillaume's card wording in the brief. With questions: card text `[[Name]] · N questions`, yellow.
   - **brief → plan:** fold his `- [i]` answers into Design, then move the answered questions with his answers word for word to `## Decisions Record` (last section, one `### Round N · YYYY-MM-DD` per round, newest on top, not collapsed); `## Open questions` keeps only what is still open. New questions on any later step go in Open questions the same way. List the parts as `- [ ]` checkboxes. If there are about 5+ parts with dependencies, also make `<Name>.canvas` next to the note: one short text card per part, "depends on" edges (`add`, `edge --label "depends on"`), then `layout <Name>.canvas --fit` (no hand placing), and link it from the card: `[[Name]] · [[Name.canvas|plan]] · review plan`. Purple: card yellow `· review plan`.
   - **plan → work:** purple = only the ticked parts / cyan sub-cards; cyan = all parts. Do what an agent can (vault edits, scripts; code on its own branch, never push or merge); anything for Guillaume becomes a weekly task linking `[[Name]]`. Tick parts, set finished sub-cards green. Unticked parts left: yellow `· review`. Questions on the way: yellow `· N questions`.
   - **done** (every part ticked and done): add `## Output` right below Aim and its Done when (links to what was made: SOP, script, note, branch); questions still in Open questions move word for word to a last round in Decisions Record (done settles them) and the empty section goes; card green `[[Name]] · done · [[Output]]` (the main output; the rest stays in the note). A wish done with no note: card green `<recap in a few words> · done · [[Output]]`, never his full wording plus a done suffix.
   - Write a `> [!info] Since last time` callout at the top of the note body (replace the previous one): 1–3 lines on what changed.
3. `node .obsidian/plugins/canvas-board/canvas.js rollup [board]`: parents take the most urgent nested color, `· N inside` and `· Nd` suffixes are refreshed. Then `node .obsidian/plugins/canvas-board/canvas.js check [board]` (read-only, never blocks the pass).
4. Report: what each card became, then the yellow/red cards with links (or "nothing needs Guillaume"), then `check: N issues` with each one (or `check: clean`).

Out of scope: green cards stay until Guillaume removes them; uncolored cards (ideas or parked) are never touched.
