import * as store from '../board/store.js';

const WIKILINK_ALIAS = /\|([^\]]+)\]\]/;

// Cards on this canvas that linked the subcanvas keep their text without the
// link (a file card shows the label) and get an edge to the new group.
function groupLinkOperations(plugin, canvas, unpacked) {
  const { here, label, isSubcanvas, links, groupId } = unpacked;
  const library = plugin.boardLibrary;
  const [fromSide, toSide] =
    library.SIDES[plugin.settings.layoutDirection] || library.SIDES.TB;
  const nodes = canvas.getData().nodes;
  const linking = links
    .filter((link) => link.path === here)
    .map((link) => nodes.find((node) => node.id === link.id))
    .filter(Boolean);

  return linking.flatMap((node) => [
    {
      op: 'set',
      id: node.id,
      text:
        node.type === 'text'
          ? library.relinkText(node.text, isSubcanvas(here), (text) => text)
          : label,
    },
    {
      op: 'edge',
      edge: {
        id: store.newId(),
        fromNode: node.id,
        fromSide,
        toNode: groupId,
        toSide,
      },
    },
  ]);
}

// Links to the subcanvas in another canvas now point at the canvas it was
// unpacked into.
function relinkCanvasData(canvasData, redirect) {
  const { library, subcanvasPath, here, hits, toLink } = redirect;
  for (const node of canvasData.nodes || []) {
    if (node.type === 'file' && node.file === subcanvasPath) {
      node.file = here;
    } else if (node.type === 'text') {
      node.text = library.relinkText(node.text, hits, toLink);
    }
  }
}

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
    if (!linkingFile) {
      continue;
    }
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

function unpackMessage(mode, { cardCount, linkCount, path }) {
  function plural(count) {
    return count > 1 ? 's' : '';
  }
  const cards = `${cardCount} card${plural(cardCount)}`;
  const links = `${linkCount} link${plural(linkCount)}`;
  const broken = linkCount ? ` (${links} now broken)` : '';

  return {
    dissolve: `unpacked ${cards}, ${path} trashed${broken}`,
    copy: `unpacked ${cards}, ${path} kept`,
    group: `unpacked ${cards} into a group, ${links} redirected`,
  }[mode];
}

// mode: dissolve (the file goes to the trash), copy (it stays) or group (the
// cards come back in a group that takes over every link to the file).
async function unpackSubcanvas(plugin, canvas, request) {
  const { node, file, mode, links = [] } = request;
  const parsed = JSON.parse((await plugin.app.vault.read(file)) || '{}');
  const subcanvas = { nodes: parsed.nodes || [], edges: parsed.edges || [] };
  const content = JSON.stringify(subcanvas, null, '\t');
  // The card's alias, else the file name.
  const alias = ((node.getData().text || '').match(WIKILINK_ALIAS) || [])[1];
  const label = (alias || file.basename).trim();
  const operations = plugin.boardLibrary.expandOps(canvas.getData(), {
    id: node.id,
    subcanvas,
    group: mode === 'group' ? label : undefined,
  });
  const here = plugin.canvasFile(canvas);
  function isSubcanvas(from) {
    return (target) => {
      const destination = plugin.app.metadataCache.getFirstLinkpathDest(
        target,
        from,
      );

      return Boolean(destination) && destination.path === file.path;
    };
  }
  const unpacked = { file, here, label, isSubcanvas, links };
  if (mode === 'group') {
    const groupId = operations.group;
    operations.push(
      ...groupLinkOperations(plugin, canvas, { ...unpacked, groupId }),
    );
  }
  plugin.edit(canvas, operations);
  if (mode === 'group') {
    await redirectOutsideLinks(plugin, unpacked);
  }
  if (mode !== 'copy') {
    await plugin.app.fileManager.trashFile(file);
  }
  const counts = {
    cardCount: subcanvas.nodes.length,
    linkCount: links.length,
    path: file.path,
  };
  plugin.undoNotice(canvas, unpackMessage(mode, counts), {
    restore: mode === 'copy' ? null : { path: file.path, content },
  });
}

// Cards (on any canvas) and notes that link `file`, except card `skipId` on
// `canvas`: [{ path, id?, label }].
async function subcanvasLinks(plugin, file, { canvas, skipId }) {
  const { vault, metadataCache } = plugin.app;
  const here = plugin.canvasFile(canvas);
  function hits(from) {
    return (target) => {
      const destination = metadataCache.getFirstLinkpathDest(target, from);

      return Boolean(destination) && destination.path === file.path;
    };
  }
  function isLinking(node, from) {
    return node.type === 'file'
      ? node.file === file.path
      : node.type === 'text' &&
          plugin.boardLibrary.relinkText(
            node.text,
            hits(from),
            () => '\u0000',
          ) !== node.text;
  }
  const canvases = vault
    .getFiles()
    .filter((each) => each.extension === 'canvas' && each.path !== file.path);
  const found = [];
  for (const canvasFile of canvases) {
    const from = canvasFile.path;
    const open = from === here ? canvas : plugin.openCanvas(from);
    const canvasData = open
      ? open.getData()
      : store.parseOrNull(await vault.cachedRead(canvasFile));
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

// requestSave() saves after a debounce: waiting lets the file on disk catch
// up before canvas.js goes on.
const SAVE_DELAY_MS = 2500;

// Changing a card's type needs setData() without the card, then with it, to
// keep its id.
async function applyToOpenCanvas(canvas, operations) {
  const canvasData = canvas.getData();
  const retyped = store.applyOps(canvasData, operations);
  if (retyped.length) {
    const nodes = canvasData.nodes.filter((node) => !retyped.includes(node.id));
    canvas.setData({ ...canvasData, nodes });
  }
  canvas.setData(canvasData);
  canvas.requestSave();
  await new Promise((resolve) => setTimeout(resolve, SAVE_DELAY_MS));

  return 'obsidian';
}

export {
  groupLinkOperations,
  relinkCanvasData,
  redirectOutsideLinks,
  unpackMessage,
  unpackSubcanvas,
  subcanvasLinks,
  applyToOpenCanvas,
};
