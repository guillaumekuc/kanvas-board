// Yellow cards whose note has not changed for `days` show its age: `· Nd`.
function ageSuffixOperation(card, days) {
  const isAging =
    card.color === '3' && card.note && card.text !== undefined && !card.inside;
  if (!isAging) return null;
  const base = card.text.replace(/ · \d+d$/, '');
  const isStale = days > 0 && card.note.ageDays >= days;
  const text = isStale ? `${base} · ${card.note.ageDays}d` : base;
  return text === card.text ? null : { op: 'set', id: card.id, text };
}

module.exports = ageSuffixOperation;
