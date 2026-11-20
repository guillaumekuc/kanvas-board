// What `check` requires, read from the user's templates (config.js): the card
// template's lines become card text shapes, the plan-note template's
// frontmatter keys and headings become the note's required shape.

const LINE_ENDINGS = /\r\n?/g;
const COMMENT = /%%[\s\S]*?%%/g;
const MARKER = /^%%\s*(optional|when done)\s*%%$/;
const HEADING = /^(#{1,6}) +(.+?)\s*$/;
const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?/;
const FRONTMATTER_KEY = /^(\w[\w-]*):/gm;
const CARD_PLACEHOLDER = /(\[\[)?\{\w+\}/g;
const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;

function escapeRegex(text) {
  return text.replace(REGEX_SPECIAL, '\\$&');
}

// One template line → a regex for a whole card text: {words} are any text on
// the line, inside [[ ]] any link target.
function shapePattern(line) {
  let pattern = '';
  let last = 0;
  for (const match of line.matchAll(CARD_PLACEHOLDER)) {
    pattern += escapeRegex(line.slice(last, match.index));
    pattern += match[1] ? '\\[\\[[^\\]\\n]+' : '[^\\n]+';
    last = match.index + match[0].length;
  }
  pattern += escapeRegex(line.slice(last));
  const shape = new RegExp(`^${pattern}$`);

  return shape;
}

function cardShapes(templateSource) {
  const lines = String(templateSource)
    .replace(LINE_ENDINGS, '\n')
    .replace(COMMENT, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return { lines, patterns: lines.map(shapePattern) };
}

// Headings with their parent (the nearest heading above of a higher level)
// and when they are required: always, optional, or once the card is done.
function templateHeadings(body) {
  const lines = body.split('\n');
  const headings = [];
  lines.forEach((line, index) => {
    const match = HEADING.exec(line);
    if (!match) {
      return;
    }
    const level = match[1].length;
    const next = lines.slice(index + 1).find((each) => each.trim());
    const marker = next && MARKER.exec(next.trim());
    const parent = [...headings].reverse().find((each) => each.level < level);
    headings.push({
      level,
      line: `${match[1]} ${match[2]}`,
      title: match[2],
      parent: parent ? parent.title : null,
      when: marker ? marker[1] : 'always',
    });
  });

  return headings;
}

function byLevel(first, second) {
  return first.level - second.level;
}

// Required headings come by level (## before ###), so the issues read from the
// top-level sections down.
function noteShape(templateSource) {
  const source = String(templateSource)
    .replace(LINE_ENDINGS, '\n')
    .replace(COMMENT, (comment) => (MARKER.test(comment) ? comment : ''));
  const frontmatter = (source.match(FRONTMATTER) || [])[1] || '';
  const keys = [...frontmatter.matchAll(FRONTMATTER_KEY)].map(
    (match) => match[1],
  );
  const headings = templateHeadings(source.replace(FRONTMATTER, ''));

  return {
    keys,
    required: headings.filter((each) => each.when === 'always').sort(byLevel),
    whenDone: headings.filter((each) => each.when === 'when done'),
  };
}

export { shapePattern, cardShapes, noteShape };
