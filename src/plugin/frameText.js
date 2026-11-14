const matchOffsets = require('./matchOffsets.js');

// Frames every `query` in the text under `root`, as search does in notes. A
// card being edited is left alone: CodeMirror owns its DOM. Returns the frames.
function frameText(root, query) {
  const ownerDocument = root.ownerDocument;
  const walker = ownerDocument.createTreeWalker(root, 4); // text nodes
  const texts = [];
  while (walker.nextNode()) texts.push(walker.currentNode);
  const frames = [];
  for (const node of texts) {
    if (node.parentElement.closest('.cm-editor, input, textarea')) continue;
    const here = [];
    // from the end, so the offsets before stay valid
    for (const offset of matchOffsets(node.data, query).reverse()) {
      const hit = node.splitText(offset);
      hit.splitText(query.length);
      const frame = ownerDocument.createElement('span');
      frame.className = 'kanvas-board-find-text';
      hit.replaceWith(frame);
      frame.append(hit);
      here.unshift(frame);
    }
    frames.push(...here);
  }
  return frames;
}

module.exports = frameText;
