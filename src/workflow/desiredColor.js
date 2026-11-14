

function desiredColor(card, inner, go) {
  if (go.has(card.color)) return card.color;
  const rolled = card.text !== undefined && / · \d+ inside/.test(card.text);
  const own = rolled ? null : card.color;
  if (inner.red || own === '1') return '1';
  if (inner.yellow || own === '3') return '3';
  if (rolled && (card.color === '1' || card.color === '3')) return inner.allGreen ? '4' : null;
  return card.color || null;
}

module.exports = desiredColor;
