const vaultPath = require('../board/vaultPath.js');
const fileSystem = require('fs');

// Level is derived from the note: `- [ ]` / `- [x]` parts make it a plan,
// otherwise it is a brief. Questions: `- [?]` above `## Decisions Record` (past
// rounds).
function noteState(relativePath) {
  const text = fileSystem.readFileSync(vaultPath(relativePath), 'utf8');
  const parts = [...text.matchAll(/^\s*- \[([ xX])\] /gm)];
  const done = parts.filter((match) => match[1] !== ' ').length;
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
