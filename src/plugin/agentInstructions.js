// The agent instructions file: a general part, then one `## <Role> cards`
// section per role (`## Do cards`, `## In Progress cards`…, `## Uncolored
// cards`). The agent reads the whole file (the pass prompt names only the
// file); Settings shows each part in its own field and joins them back on
// save. A file without sections is all general, so nothing is lost. Parts are
// keyed by the slot's color name (fixed: `cyan` is Do's slot); the older
// `## Cyan cards` headings still read as that slot's role.
import * as config from '../workflow/config.js';

const LEADING_BLANK_LINES = /^(?:[ \t]*\n)+/;
const LINE_BREAK = /\r?\n/;

function capitalized(word) {
  return `${word[0].toUpperCase()}${word.slice(1)}`;
}

// A slot's heading text, from its color name: its role's default label.
function sectionTitle(colorName) {
  const role = config.ROLES.find(({ color }) => color === colorName);

  return `${role ? role.label : 'Uncolored'} cards`;
}

function headingColor(line, colorNames) {
  const heading = line.trim();

  return colorNames.find((colorName) =>
    [
      sectionTitle(colorName),
      `${capitalized(colorName === 'none' ? 'uncolored' : colorName)} cards`,
    ].some((title) => heading === `## ${title}`),
  );
}

// Blank lines around a part are layout, not content.
function trimBlankLines(text) {
  return String(text || '')
    .replace(LEADING_BLANK_LINES, '')
    .trimEnd();
}

function splitInstructions(text, colorNames) {
  const general = [];
  const sections = {};
  let current = general;
  for (const line of String(text || '').split(LINE_BREAK)) {
    const colorName = headingColor(line, colorNames);
    if (!colorName) {
      current.push(line);
      continue;
    }
    sections[colorName] ||= [];
    current = sections[colorName];
  }
  const colors = {};
  for (const colorName of colorNames) {
    colors[colorName] = trimBlankLines((sections[colorName] || []).join('\n'));
  }

  return { general: trimBlankLines(general.join('\n')), colors };
}

function joinInstructions(parts, colorNames) {
  const sections = colorNames
    .map((colorName) => [colorName, trimBlankLines(parts.colors[colorName])])
    .filter(([, body]) => body)
    .map(([colorName, body]) => `## ${sectionTitle(colorName)}\n\n${body}`);
  const blocks = [trimBlankLines(parts.general), ...sections].filter(Boolean);

  return `${blocks.join('\n\n')}\n`;
}

export { sectionTitle, splitInstructions, joinInstructions };
