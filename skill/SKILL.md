---
name: canvas-board
description: Run one agent pass over the planning canvas (Plans.canvas and the plan canvases it links): take every cyan or purple card up the ladder (wish → brief → plan → done), recolor it, roll statuses up and report what needs Guillaume. Use for "/canvas-board", "run a pass", "recheck the board", "check Plans.canvas", or when the Obsidian "Canvas board: run pass" command opens a session.
argument-hint: "[board path, default Plans.canvas]"
---

# Canvas board pass

Rules and vocabulary: `Wiki/G&A/PKM/SOP - Canvas Board.md`. Read it first. **The card color is the state**: notes carry no board fields beyond `tags`.

**Never edit a `.canvas` file with Write/Edit/sed.** Every board change goes through `node _scripts/canvas.js` (it uses the Obsidian CLI when the board is open, the file otherwise). Never move or resize cards; new cards go next to their parent (`add --near`).

1. `node _scripts/canvas.js tree [board]`. List the cyan (`"5"`, go auto) and purple (`"6"`, go plan) cards at any depth, plus the current yellow/red count.
2. WIP limit: if 5 or more cards are already yellow/red, only take cards whose step will not end in a question; say which you skipped.
3. For each card, set it orange (`set <board> <id> --color orange`), then work by its level (`note.level` from `tree`: no note = wish, note without `- [ ]` parts = brief, with parts = plan). **Purple:** one step, then back to Guillaume. **Cyan:** keep stepping (every part counts as ticked) until a question, something only he can review, or done.
   - **wish → brief:** create `Projects/_assets/plans/<Name>.md` (name says what it is, no context needed) with frontmatter `tags` (one `context/*`) only, then Aim · Done when · Design · Open questions as `- [?]`. Keep Guillaume's card wording in the brief. With questions: card text `[[Name]] · N questions`, yellow.
   - **brief → plan:** fold his `- [i]` answers into Design (keep his answers in place). List the parts as `- [ ]` checkboxes. If there are about 5+ parts with dependencies, also make `<Name>.canvas` next to the note: one short text card per part, "depends on" edges (`add`, `edge`), and link it from the card: `[[Name]] · [[Name.canvas|plan]] · review plan`. Purple: card yellow `· review plan`.
   - **plan → work:** purple = only the ticked parts / cyan sub-cards; cyan = all parts. Do what an agent can (vault edits, scripts; code on its own branch, never push or merge); anything for Guillaume becomes a weekly task linking `[[Name]]`. Tick parts, set finished sub-cards green. Unticked parts left: yellow `· review`. Questions on the way: yellow `· N questions`.
   - **done** (every part ticked and done): add `## Output` to the note (links to what was made: SOP, script, note, branch), card green `[[Name]] · done · [[Output]]` (the main output; the rest stays in the note).
   - Write a `> [!info] Since last time` callout at the top of the note body (replace the previous one): 1–3 lines on what changed.
4. `node _scripts/canvas.js rollup [board]`: parents take the most urgent nested color, `· N inside` and `· Nd` suffixes are refreshed.
5. Report: what each card became, then the yellow/red cards with links (or "nothing needs Guillaume").

Out of scope: green cards stay until Guillaume removes them; uncolored cards (ideas or parked) are never touched.
