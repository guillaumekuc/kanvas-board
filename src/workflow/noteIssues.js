const noteContexts = require('../board/noteContexts.js');

const REQUIRED_SECTIONS = ['Aim', 'Design'];

// A plan note's shape: `context` as the only property, one context, the
// required sections, and ## Output once the card is green.
function noteIssues(source, color) {
  const frontmatter = (source.match(/^---\n([\s\S]*?)\n---/) || [])[1];
  const keys = frontmatter
    ? [...frontmatter.matchAll(/^(\w[\w-]*):/gm)].map((match) => match[1])
    : [];
  function hasHeading(heading) {
    return new RegExp(`^${heading}\s*$`, 'm').test(source);
  }
  const issues = [];
  if (keys.join() !== 'context') {
    const listed = keys.join(', ') || 'none';
    issues.push(`note frontmatter is not \`context\` only (${listed})`);
  }
  if (noteContexts(frontmatter).length !== 1) {
    issues.push('note does not have exactly one context');
  }
  for (const section of REQUIRED_SECTIONS) {
    if (!hasHeading(`## ${section}`)) issues.push(`note has no ## ${section}`);
  }
  if (!hasHeading('### Done when')) {
    issues.push('note has no ### Done when (under Aim)');
  }
  if (color === '4' && !hasHeading('## Output')) {
    issues.push('green card, note has no ## Output');
  }
  return issues;
}

module.exports = noteIssues;
