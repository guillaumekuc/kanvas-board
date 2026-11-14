const path = require('path');

// Wikilinks (and embeds) in `text` whose target `hits(linkpath)` become `to(label)`; label = alias, else file name.
function relinkText(text, hits, to) {
  return (text || '').replace(/!?\[\[([^\]|#]+)(#[^\]|]*)?(?:\|([^\]]*))?\]\]/g, (m, target, sub, alias) =>
    hits(target.trim()) ? to(alias || path.posix.basename(target.trim()).replace(/\.canvas$/, '')) : m);
}

module.exports = relinkText;
