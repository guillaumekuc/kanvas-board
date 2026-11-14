const path = require('path');

// Wikilinks (and embeds) in `text` whose target `hits(linkpath)` become `replace(label)`; label = alias, else file name.
function relinkText(text, hits, replace) {
  return (text || '').replace(
    /!?\[\[([^\]|#]+)(#[^\]|]*)?(?:\|([^\]]*))?\]\]/g,
    (link, target, subpath, alias) =>
      hits(target.trim())
        ? replace(
            alias ||
              path.posix.basename(target.trim()).replace(/\.canvas$/, ''),
          )
        : link,
  );
}

module.exports = relinkText;
