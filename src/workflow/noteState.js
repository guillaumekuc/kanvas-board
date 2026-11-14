const abs = require('../board/abs.js');
const fs = require('fs');

// Level is derived from the note: `- [ ]` / `- [x]` parts make it a plan, otherwise it is a brief.
// Questions: `- [?]` above `## Decisions Record` (past rounds).
function noteState(rel) {
  const text = fs.readFileSync(abs(rel), 'utf8');
  const parts = [...text.matchAll(/^\s*- \[([ xX])\] /gm)];
  const done = parts.filter((m) => m[1] !== ' ').length;
  const questions = [
    ...text.split(/^## Decisions Record/m)[0].matchAll(/^\s*- \[\?\] /gm),
  ].length; // answered rounds don't count
  return {
    level: parts.length ? 'plan' : 'brief',
    parts: { done, total: parts.length },
    questions,
  };
}

module.exports = noteState;
