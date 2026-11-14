const cardLinkTargets = require('./cardLinkTargets.js');
const cardTextOk = require('./cardTextOk.js');
const findFile = require('../board/findFile.js');

const TEXT_SHAPES =
  'card text is neither a wish (≤ 3 lines), `[[Note]] · reason` ' +
  'nor `<recap> · done · [[Output]]`';

// Broken links, and card text off the ladder's shapes on the top board
// (plan-canvas cards are parts: free text).
function cardIssues(node, depth) {
  const issues = cardLinkTargets(node)
    .filter((link) => !findFile(link))
    .map((link) => `broken link [[${link}]]`);
  const isTopText = node.type === 'text' && depth === 0;
  if (isTopText && !cardTextOk(node.text || '')) issues.push(TEXT_SHAPES);
  return issues;
}

module.exports = cardIssues;
