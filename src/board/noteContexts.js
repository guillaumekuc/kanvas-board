// Contexts in a note's frontmatter text: the `context:` list (or a single value).
function noteContexts(frontmatter) {
  if (!frontmatter) return [];
  const unq = (value) => value.trim().replace(/^(["'])(.*)\1$/, '$2');
  const match = /^context:[ \t]*(.*)((?:\r?\n[ \t]+-.*)*)/m.exec(frontmatter);
  if (!match) return [];
  return (
    match[1].trim()
      ? match[1].replace(/^\[|\]$/g, '').split(',')
      : match[2]
          .split(/\r?\n/)
          .filter((line) => line.trim())
          .map((line) => line.replace(/^\s+-\s*/, ''))
  )
    .map(unq)
    .filter(Boolean);
}

module.exports = noteContexts;
