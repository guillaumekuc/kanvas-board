const abs = require('./abs.js');
const cardLinks = require('./cardLinks.js');
const fs = require('fs');
const noteContexts = require('./noteContexts.js');

// Context of the note a card links, to file its archive note under the same context.
function cardContexts(n) {
  const { note } = cardLinks(n);
  const fm = note && (fs.readFileSync(abs(note), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1];
  const c = noteContexts(fm);
  return c.length ? c : undefined;
}

module.exports = cardContexts;
