// The agent instructions file: a general part, then one `## <Color> cards`
// section per color. The agent reads the whole file (the pass prompt names
// only the file); Settings shows each part in its own field and joins them
// back on save. A file without sections is all general, so nothing is lost.

function sectionTitle(colorName) {
  const word = colorName === 'none' ? 'uncolored' : colorName;
  return `${word[0].toUpperCase()}${word.slice(1)} cards`;
}

function headingColor(line, colorNames) {
  const heading = line.trim();
  return colorNames.find(
    (colorName) => heading === `## ${sectionTitle(colorName)}`,
  );
}

// Blank lines around a part are layout, not content.
function trimBlankLines(text) {
  return String(text || '').replace(/^(?:[ \t]*\n)+/, '').trimEnd();
}

function splitInstructions(text, colorNames) {
  const general = [];
  const sections = {};
  let current = general;
  for (const line of String(text || '').split(/\r?\n/)) {
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

module.exports = { sectionTitle, splitInstructions, joinInstructions };
