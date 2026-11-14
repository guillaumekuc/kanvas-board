const GAP = 40;

// True when a moving card, shifted by `offset`, comes within GAP of a card
// in `others`.
function overlapsAny(moving, others, offset) {
  const isNear = (card, other) =>
    card.x + offset.x < other.x + other.width + GAP &&
    card.x + offset.x + card.width + GAP > other.x &&
    card.y + offset.y < other.y + other.height + GAP &&
    card.y + offset.y + card.height + GAP > other.y;
  return moving.some((card) => others.some((other) => isNear(card, other)));
}

module.exports = overlapsAny;
