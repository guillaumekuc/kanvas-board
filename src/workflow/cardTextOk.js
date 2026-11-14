

// --- Check --------------------------------------------------------------------------------------------

// Structure only, never content: the invariants the skill states. A check that never fires in a month
// gets deleted; a new one only after the same defect shows up twice.
// A card the agent wrote: a wish (≤ 3 lines), `[[Note]] · reason`, or a recap `<words> · done · [[Output]]`.
const cardTextOk = raw => {
  const text = raw.trim();
  if (!text.includes('[[')) return text.split('\n').length <= 3;
  return /^\[\[[^\]]+\]\]( · .+)?$/.test(text) || /^[^\n]+ · done · \[\[[^\]]+\]\]$/.test(text);
};

module.exports = cardTextOk;
