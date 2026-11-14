// Offsets of `query` in `text`, ignoring case.
function matchOffsets(text, query) {
  const pattern = new RegExp(
    query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    'gi',
  );
  return Array.from(text.matchAll(pattern), (match) => match.index);
}

module.exports = matchOffsets;
