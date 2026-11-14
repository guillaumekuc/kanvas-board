const groupLinkOperations = require('./groupLinkOperations.js');
const redirectOutsideLinks = require('./redirectOutsideLinks.js');
const unpackMessage = require('./unpackMessage.js');

// mode: dissolve (the file goes to the trash), copy (it stays) or group (the
// cards come back in a group that takes over every link to the file).
async function unpackSubcanvas(plugin, canvas, request) {
  const { node, file, mode, links = [] } = request;
  const parsed = JSON.parse((await plugin.app.vault.read(file)) || '{}');
  const subcanvas = { nodes: parsed.nodes || [], edges: parsed.edges || [] };
  const content = JSON.stringify(subcanvas, null, '\t');
  // The card's alias, else the file name.
  const alias = ((node.getData().text || '').match(/\|([^\]]+)\]\]/) || [])[1];
  const label = (alias || file.basename).trim();
  const operations = plugin.boardLibrary.expandOps(canvas.getData(), {
    id: node.id,
    subcanvas,
    group: mode === 'group' ? label : undefined,
  });
  const here = plugin.canvasFile(canvas);
  const isSubcanvas = (from) => (target) => {
    const destination = plugin.app.metadataCache.getFirstLinkpathDest(
      target,
      from,
    );
    return Boolean(destination) && destination.path === file.path;
  };
  const unpacked = { file, here, label, isSubcanvas, links };
  if (mode === 'group') {
    const groupId = operations.group;
    operations.push(
      ...groupLinkOperations(plugin, canvas, { ...unpacked, groupId }),
    );
  }
  plugin.edit(canvas, operations);
  if (mode === 'group') await redirectOutsideLinks(plugin, unpacked);
  if (mode !== 'copy') await plugin.app.fileManager.trashFile(file);
  const counts = {
    cardCount: subcanvas.nodes.length,
    linkCount: links.length,
    path: file.path,
  };
  plugin.undoNotice(canvas, unpackMessage(mode, counts), {
    restore: mode === 'copy' ? null : { path: file.path, content },
  });
}

module.exports = unpackSubcanvas;
