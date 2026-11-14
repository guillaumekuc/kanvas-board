const desiredColor = require('./desiredColor.js');

// A card linking a nested board takes its most urgent color and the count of
// red / yellow cards inside as `· N inside` (any `· Nd` age goes).
function nestedCardUpdate(card, inner, goColorSet) {
  const color = desiredColor(card, inner, goColorSet);
  const waiting = inner.red + inner.yellow;
  const text =
    card.text === undefined
      ? undefined
      : card.text.replace(/ · \d+ inside| · \d+d$/g, '') +
        (waiting ? ` · ${waiting} inside` : '');
  const isTextChanged = text !== card.text;
  if (color === card.color && !isTextChanged) {
    return { color: card.color, operation: null };
  }
  const operation = {
    op: 'set',
    id: card.id,
    color: color === null ? '' : color,
  };
  if (isTextChanged) operation.text = text;
  return { color, operation };
}

module.exports = nestedCardUpdate;
