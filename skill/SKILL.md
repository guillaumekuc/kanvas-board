---
name: canvas-board
description: Run one agent pass over the planning canvas (Plans.canvas and the plan canvases it links): take every cyan card one step up the ladder (wish → brief → plan → done), recolor it, roll statuses up and report what needs Guillaume. Use for "/canvas-board", "run a pass", "recheck the board", "check Plans.canvas", or when the Obsidian "Canvas board: run pass" command opens a session.
argument-hint: "[board path, default Plans.canvas]"
---

# Canvas board pass

Rules and vocabulary: `Wiki/G&A/PKM/SOP - Canvas Board.md`. Read it first.

**Never edit a `.canvas` file with Write/Edit/sed.** Every board change goes through `node _scripts/canvas.js` (it uses the Obsidian CLI when the board is open, the file otherwise). Never move or resize cards; new cards go next to their parent (`add --near`).

1. `node _scripts/canvas.js tree [board]`. List the cyan (`"5"`) cards at any depth, plus the current yellow/red count (cards and notes with `attention`).
2. WIP limit: if 5 or more things already need Guillaume, only take cyan cards whose step will not end in a question; say which you skipped.
3. For each cyan card, set it orange (`set <board> <id> --color orange`), then do **one** step depending on its level (`note.level`, or no note = wish) and `mode` (default `plan`):
   - **wish → brief:** create `Projects/_assets/plans/<Name>.md` (name says what it is, no context needed) with frontmatter `tags` (one `context/*`), `status: backlog`, `level: brief`, `mode: plan`, `attention: question`, then Aim · Done when · Design · Open questions as `- [?]`. Keep Guillaume's card wording in the brief. Card text becomes `[[Name]] · N questions`, color yellow.
   - **brief → plan:** fold his `- [i]` answers into Design (keep his answers in place). List the parts as `- [ ]` checkboxes. If there are about 5+ parts with dependencies, also make `<Name>.canvas` next to the note: one short text card per part, "depends on" edges (`add`, `edge`), and link it from the card: `[[Name]] · [[Name.canvas|plan]] · review plan`. `level: plan`, `attention: review`, yellow.
   - **plan → work:** mode `plan` = do only the checked parts / cyan sub-cards; mode `auto` = all parts. Do what an agent can (vault edits, scripts; code on its own branch, never push or merge); anything for Guillaume becomes a weekly task linking `[[Name]]`. Tick parts, set finished sub-cards green. When every part is done: `status: done`, remove `attention`, card green `· done`. Questions on the way: `attention: question`, yellow.
   - Write a `> [!info] Since last time` callout at the top of the note body (replace the previous one): 1–3 lines on what changed.
   - Set `attention` whenever the card ends yellow (`question` / `review`) or red (`blocked`); remove it otherwise.
4. `node _scripts/canvas.js rollup [board]`: parents take the most urgent nested color, `· N inside` and `· Nd` suffixes are refreshed.
5. Report: what each card became, then the yellow/red list with links (or "`Board.base` is empty").

Out of scope: green cards stay until Guillaume removes them; purple (parked) and uncolored cards are never touched.
