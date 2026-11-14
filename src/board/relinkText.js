const path = require('path');

// Wikilinks (and embeds) in `text` whose target `hits(linkpath)` become `replace(label)`; label = alias, else file name.
function relinkText(text, hits, replace) {
  return (text || '').replace(
    /!?\[\[([^\]|#]+)(#[^\]|]*)?(?:\|([^\]]*))?\]\]/g,
    (link, ...groups) => {
      const [target, , alias] = groups; // the #subpath group is not needed
      if (!hits(target.trim())) return link;
      const name = path.posix.basename(target.trim()).replace(/\.canvas$/, '');
      return replace(alias || name);
    },
  );
}

module.exports = relinkText;
