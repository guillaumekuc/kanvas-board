

// Contexts in a note's frontmatter text: the `context:` list (or a single value).
function noteContexts(fm) {
  if (!fm) return [];
  const unq = s => s.trim().replace(/^(["'])(.*)\1$/, '$2');
  const m = /^context:[ \t]*(.*)((?:\r?\n[ \t]+-.*)*)/m.exec(fm);
  if (!m) return [];
  return (m[1].trim() ? m[1].replace(/^\[|\]$/g, '').split(',') : m[2].split(/\r?\n/).filter(l => l.trim()).map(l => l.replace(/^\s+-\s*/, '')))
    .map(unq).filter(Boolean);
}

module.exports = noteContexts;
