import path from 'path';
import fileSystem from 'fs';
import * as refactor from './refactor.js';
import * as store from './store.js';

const WIKILINK_TARGET = /\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g;
const QUOTED_VALUE = /^(["'])(.*)\1$/;
const CONTEXT_FIELD = /^context:[ \t]*(.*)((?:\r?\n[ \t]+-.*)*)/m;
const OUTER_BRACKETS = /^\[|\]$/g;
const FRONTMATTER_BLOCK = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;
const LINE_MARKUP_PREFIX = /^\s*([>#]+\s*|([-*+]|\d+[.)])\s+(\[.\]\s+)?)/;
const WIKILINK_SHOWN_TEXT = /\[\[([^\]|]*\|)?([^\]]*)\]\]/g;
const NOTE_NAME_FORBIDDEN = /[#^|[\]*_`>:\\/"?<]/g;
const LEADING_LINE_BREAK = /^\r?\n/;
const LINE_BREAK = /\r?\n/;
const LIST_ITEM_DASH = /^\s+-\s*/;
const WHITESPACE_RUN = /\s+/g;
const TRAILING_SLASHES = /[/\\]+$/;
const BACKSLASH = /\\/g;
const ARCHIVED_FROM_FIELD = /^archived-from:/m;
const OUTER_WIKILINK_BRACKETS = /^\[\[|\]\]$/g;
const TRAILING_WHITESPACE = /\s+$/;
const ARCHIVED_EDGE_LINE = /^ {2}- (".*")$/gm;

function cardLinks(node) {
  const targets =
    node.type === 'file'
      ? [node.file]
      : [...(node.text || '').matchAll(WIKILINK_TARGET)].map((match) =>
          store.findFile(match[1].trim()),
        );
  const found = targets.filter(Boolean);
  return {
    note: found.find((file) => file.endsWith('.md')) || null,
    canvas: found.find((file) => file.endsWith('.canvas')) || null,
  };
}

const LINKABLE = /\.(md|canvas)$/;

// Cards (any .canvas) and notes (.md) that link `relativePath`, except card
// `skipId` on `board`: ['path (card id)' | 'path'].
function linksTo(relativePath, board, skipId) {
  function hits(target) {
    return store.findFile(target) === relativePath;
  }
  function isLinking(text) {
    return refactor.relinkText(text, hits, () => '\u0000') !== (text || '');
  }
  function isLinkingCard(node) {
    return node.type === 'file'
      ? node.file === relativePath
      : isLinking(node.text);
  }
  function linksIn(file, source) {
    if (file.endsWith('.md')) {
      return isLinking(source) ? [file] : [];
    }
    const nodes = (store.parseOrNull(source) || {}).nodes || [];
    return nodes
      .filter((node) => !(file === board && node.id === skipId))
      .filter(isLinkingCard)
      .map((node) => `${file} (${node.id})`);
  }
  const name = path.posix.basename(relativePath);
  const found = [];
  for (const file of store.vaultFileIndex.paths()) {
    if (file === relativePath || !LINKABLE.test(file)) {
      continue;
    }
    const source = store.readOrNull(file);
    if (source && source.includes(name)) {
      found.push(...linksIn(file, source));
    }
  }
  return found;
}

// Contexts in a note's frontmatter text: the `context:` list (or a single
// value).
function noteContexts(frontmatter) {
  if (!frontmatter) {
    return [];
  }
  function unquote(value) {
    return value.trim().replace(QUOTED_VALUE, '$2');
  }
  const match = CONTEXT_FIELD.exec(frontmatter);
  if (!match) {
    return [];
  }
  return (
    match[1].trim()
      ? match[1].replace(OUTER_BRACKETS, '').split(',')
      : match[2]
          .split(LINE_BREAK)
          .filter((line) => line.trim())
          .map((line) => line.replace(LIST_ITEM_DASH, ''))
  )
    .map(unquote)
    .filter(Boolean);
}

// Context of the note a card links, to file its archive note under the same
// context.
function cardContexts(node) {
  const { note } = cardLinks(node);
  const frontmatter =
    note &&
    (fileSystem
      .readFileSync(store.vaultPath(note), 'utf8')
      .match(FRONTMATTER) || [])[1];
  const contexts = noteContexts(frontmatter);
  return contexts.length ? contexts : undefined;
}

function noteName(text) {
  return (
    (
      String(text)
        .split('\n')
        .find((line) => line.trim()) || 'Card'
    )
      .replace(LINE_MARKUP_PREFIX, '')
      .replace(WIKILINK_SHOWN_TEXT, '$2')
      .replace(NOTE_NAME_FORBIDDEN, '')
      .replace(WHITESPACE_RUN, ' ')
      .trim()
      .slice(0, 60)
      .trim() || 'Card'
  );
}

function yamlStr(value) {
  return JSON.stringify(String(value));
}

// Board + linked notes (path, age; `noteInfo(path)` adds more, workflow/tree.js
// passes the level) + nested canvases.
function tree(board, { noteInfo, depth = 0, seen = new Set() } = {}) {
  seen.add(board);
  const canvasData = store.readBoard(board);
  return {
    board,
    cards: canvasData.nodes
      .filter((node) => node.type !== 'group')
      .map((node) => {
        const { note, canvas } = cardLinks(node);
        const card = {
          id: node.id,
          color: node.color || null,
          text: node.type === 'text' ? node.text : undefined,
          file: node.file,
        };
        if (note) {
          const ageDays = Math.floor(
            (Date.now() - fileSystem.statSync(store.vaultPath(note)).mtimeMs) /
              86400000,
          );
          card.note = {
            path: note,
            ageDays,
            ...(noteInfo ? noteInfo(note) : {}),
          };
        }
        if (canvas && !seen.has(canvas) && depth < 2) {
          card.inside = tree(canvas, { noteInfo, depth: depth + 1, seen });
        }
        return card;
      }),
    edges: canvasData.edges.map((edge) => ({
      from: edge.fromNode,
      to: edge.toNode,
      label: edge.label,
    })),
  };
}

function colorArg(color) {
  return color === undefined
    ? undefined
    : color === 'none'
      ? ''
      : store.COLORS[color] || color;
}

// Where a board's archive notes go: "<board name> archive" next to the board,
// or with the setting "Archive" on global, one folder for all boards (setting
// "Archive folder"). `options`: the plugin settings (data.json).
function archiveDir(board, options = {}) {
  if (options.archiveMode === 'global') {
    return (
      String(options.archiveFolder || store.ARCHIVE_DIR)
        .trim()
        .replace(TRAILING_SLASHES, '') || store.ARCHIVE_DIR
    );
  }
  const boardPath = String(board).replace(BACKSLASH, '/'),
    folder = path.posix.dirname(boardPath);
  return (
    (folder === '.' ? '' : folder + '/') +
    path.posix.basename(boardPath, '.canvas') +
    ' archive'
  );
}

// An archived card becomes a note (body = its text, or a link to its file)
// whose frontmatter keeps what a restore needs: board, id, place, size, color
// and its edges. Listed by Canvas archive.base. Returns { name, content,
// operations }. `contexts`: the context of the note the archived card links,
// else data.json `archiveContexts`, else none.
function archiveNote(canvasData, { id, board, date, contexts = [] }) {
  const node = canvasData.nodes.find((node) => node.id === id);
  if (!node) {
    throw new Error('no node ' + id);
  }
  const edges = canvasData.edges
    .filter((edge) => edge.fromNode === id || edge.toNode === id)
    .map((edge) =>
      yamlStr(
        [
          edge.id,
          edge.fromNode,
          edge.fromSide || '',
          edge.toNode,
          edge.toSide || '',
          edge.label || '',
        ].join(' | '),
      ),
    );
  const frontmatter = [
    '---',
    ...(contexts.length ? ['context:'] : []),
    ...contexts.map((context) => `  - ${context}`),
    `archived-from: "[[${board}]]"`,
    `archived: ${date}`,
    `card-id: ${yamlStr(node.id)}`,
    `card-type: ${node.type}`,
    ...(node.type === 'file' ? [`card-file: ${yamlStr(node.file)}`] : []),
    ...(node.type === 'link' ? [`card-url: ${yamlStr(node.url)}`] : []),
    `x: ${node.x}`,
    `y: ${node.y}`,
    `width: ${node.width}`,
    `height: ${node.height}`,
    `color: ${yamlStr(node.color || '')}`,
    edges.length ? 'edges:' : 'edges: []',
    ...edges.map((edge) => `  - ${edge}`),
    '---',
    '',
  ].join('\n');
  const body =
    node.type === 'text'
      ? node.text
      : node.type === 'file'
        ? `[[${node.file}]]`
        : node.type === 'link'
          ? node.url
          : node.label || '';
  return {
    name: noteName(
      node.type === 'text' ? node.text : node.file || node.url || node.label,
    ),
    content: frontmatter + body + '\n',
    operations: [{ op: 'remove', id }],
  };
}

// Parses an archive note; returns { board, operations } that put the card back
// (same id if free) with the edges whose other end is still on the board.
function restoreOps(canvasData, source) {
  const frontmatter = (source.match(FRONTMATTER_BLOCK) || [])[1];
  if (!frontmatter || !ARCHIVED_FROM_FIELD.test(frontmatter)) {
    throw new Error('not an archived card note');
  }
  function get(field) {
    const fieldLine = new RegExp(`^${field}: (.*)$`, 'm');
    const match = fieldLine.exec(frontmatter);
    if (!match) {
      return undefined;
    }
    const value = match[1].trim();
    return value.startsWith('"') ? JSON.parse(value) : value;
  }
  const board = get('archived-from').replace(OUTER_WIKILINK_BRACKETS, '');
  const body = source
    .slice(source.indexOf('---', 3) + 3)
    .replace(LEADING_LINE_BREAK, '')
    .replace(TRAILING_WHITESPACE, '');
  const type = get('card-type') || 'text';
  const ids = new Set(canvasData.nodes.map((node) => node.id));
  const id = ids.has(get('card-id')) ? store.newId() : get('card-id');
  const node = {
    id,
    type,
    x: Number(get('x')),
    y: Number(get('y')),
    width: Number(get('width')),
    height: Number(get('height')),
  };
  if (type === 'text') {
    node.text = body;
  }
  if (type === 'file') {
    node.file = get('card-file');
  }
  if (type === 'link') {
    node.url = get('card-url');
  }
  if (get('color')) {
    node.color = get('color');
  }
  const edges = restoredEdgeOps(canvasData, frontmatter, {
    archivedId: get('card-id'),
    restoredId: id,
  });
  return { board, operations: [{ op: 'add', node }, ...edges] };
}

// The archived card's edges (frontmatter lines "  - "id | from | ..."") as
// edge operations, skipping edges already there or whose other end is gone.
function restoredEdgeOps(canvasData, frontmatter, { archivedId, restoredId }) {
  const ids = new Set(canvasData.nodes.map((node) => node.id));
  const edgeIds = new Set(canvasData.edges.map((edge) => edge.id));
  const operations = [];
  for (const edgeLine of frontmatter.matchAll(ARCHIVED_EDGE_LINE)) {
    const [edgeId, from, fromSide, toId, toSide, label] = JSON.parse(
      edgeLine[1],
    ).split(' | ');
    const fromNode = from === archivedId ? restoredId : from;
    const toNode = toId === archivedId ? restoredId : toId;
    const isEndMissing = [fromNode, toNode].some(
      (end) => end !== restoredId && !ids.has(end),
    );
    if (edgeIds.has(edgeId) || isEndMissing) {
      continue;
    }
    // Optional fields (sides, label) only when the archive had them
    const edge = Object.fromEntries(
      Object.entries({
        id: edgeId,
        fromNode,
        toNode,
        fromSide,
        toSide,
        label,
      }).filter(([, value]) => value),
    );
    operations.push({ op: 'edge', edge });
  }
  return operations;
}

export {
  cardLinks,
  linksTo,
  noteContexts,
  cardContexts,
  noteName,
  yamlStr,
  tree,
  colorArg,
  archiveDir,
  archiveNote,
  restoreOps,
};
