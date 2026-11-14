const plural = (count) => (count > 1 ? 's' : '');

function unpackMessage(mode, { cardCount, linkCount, path }) {
  const cards = `${cardCount} card${plural(cardCount)}`;
  const links = `${linkCount} link${plural(linkCount)}`;
  const broken = linkCount ? ` (${links} now broken)` : '';
  return {
    dissolve: `unpacked ${cards}, ${path} trashed${broken}`,
    copy: `unpacked ${cards}, ${path} kept`,
    group: `unpacked ${cards} into a group, ${links} redirected`,
  }[mode];
}

module.exports = unpackMessage;
