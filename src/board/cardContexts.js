const vaultPath = require('./vaultPath.js');
const cardLinks = require('./cardLinks.js');
const fileSystem = require('fs');
const noteContexts = require('./noteContexts.js');

// Context of the note a card links, to file its archive note under the same
// context.
function cardContexts(node) {
  const { note } = cardLinks(node);
  const frontmatter =
    note &&
    (fileSystem
      .readFileSync(vaultPath(note), 'utf8')
      .match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1];
  const contexts = noteContexts(frontmatter);
  return contexts.length ? contexts : undefined;
}

module.exports = cardContexts;
