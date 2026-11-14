// Ids of the cards created, deleted, or changed in content or color. Pure, for
// the tests.
function touchedCards(before, after) {
  const out = [];
  for (const [id, content] of after) {
    if (before.get(id) !== content) out.push(id);
  }
  for (const id of before.keys()) if (!after.has(id)) out.push(id);
  return out;
}

module.exports = touchedCards;
