const parseOrNull = require('../board/parseOrNull.js');

// Cards (on any canvas) and notes that link `file`, except card `skipId` on
// `canvas`: [{ path, id?, label }].
async function subcanvasLinks(plugin, file, { canvas, skipId }) {
  const { vault, metadataCache } = plugin.app;
  const here = plugin.canvasFile(canvas);
  const hits = (from) => (target) => {
    const destination = metadataCache.getFirstLinkpathDest(target, from);
    return Boolean(destination) && destination.path === file.path;
  };
  const isLinking = (node, from) =>
    node.type === 'file'
      ? node.file === file.path
      : node.type === 'text' &&
        plugin.boardLibrary.relinkText(
          node.text,
          hits(from),
          () => '\u0000',
        ) !== node.text;
  const canvases = vault
    .getFiles()
    .filter((each) => each.extension === 'canvas' && each.path !== file.path);
  const found = [];
  for (const canvasFile of canvases) {
    const from = canvasFile.path;
    const open = from === here ? canvas : plugin.openCanvas(from);
    const canvasData = open
      ? open.getData()
      : parseOrNull(await vault.cachedRead(canvasFile));
    const nodes = ((canvasData || {}).nodes || []).filter(
      (node) => !(from === here && node.id === skipId) && isLinking(node, from),
    );
    found.push(
      ...nodes.map((node) => ({
        path: from,
        id: node.id,
        label: (node.text || node.file || '').split('\n')[0],
      })),
    );
  }
  const resolved = metadataCache.resolvedLinks;
  const notes = Object.keys(resolved).filter(
    (source) =>
      source !== file.path &&
      !source.endsWith('.canvas') &&
      resolved[source][file.path],
  );
  return [
    ...found,
    ...notes.map((source) => ({ path: source, label: source })),
  ];
}

module.exports = subcanvasLinks;
