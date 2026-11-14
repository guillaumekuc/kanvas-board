// A .canvas file that is not valid JSON (being written, broken) is skipped.
function parseOrNull(json) {
  try {
    return JSON.parse(json || '{}');
  } catch {
    return null;
  }
}

module.exports = parseOrNull;
