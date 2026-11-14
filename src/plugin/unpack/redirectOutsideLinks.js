const relinkCanvasData = require('./relinkCanvasData.js');

// Other notes and canvases that linked the subcanvas link this canvas instead
// (open canvases are edited in memory so Obsidian does not save over them).
async function redirectOutsideLinks(plugin, unpacked) {
  const { file, here, isSubcanvas, links } = unpacked;
  const library = plugin.boardLibrary;
  function toLink(alias) {
    return `[[${here}|${alias}]]`;
  }
  const paths = new Set(
    links.filter((link) => link.path !== here).map((link) => link.path),
  );
  for (const filePath of paths) {
    const linkingFile = plugin.app.vault.getAbstractFileByPath(filePath);
    if (!linkingFile) continue;
    const hits = isSubcanvas(filePath);
    const redirect = { library, subcanvasPath: file.path, here, hits, toLink };
    const open = filePath.endsWith('.canvas') && plugin.openCanvas(filePath);
    if (open) {
      const canvasData = open.getData();
      relinkCanvasData(canvasData, redirect);
      open.setData(canvasData);
      open.requestSave();
      continue;
    }
    await plugin.app.vault.process(linkingFile, (content) => {
      if (!filePath.endsWith('.canvas')) {
        return library.relinkText(content, hits, toLink);
      }
      const canvasData = JSON.parse(content || '{}');
      relinkCanvasData(canvasData, redirect);
      return JSON.stringify(canvasData, null, '\t');
    });
  }
}

module.exports = redirectOutsideLinks;
