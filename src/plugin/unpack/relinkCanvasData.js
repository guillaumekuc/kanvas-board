// Links to the subcanvas in another canvas now point at the canvas it was
// unpacked into.
function relinkCanvasData(canvasData, redirect) {
  const { library, subcanvasPath, here, hits, toLink } = redirect;
  for (const node of canvasData.nodes || []) {
    if (node.type === 'file' && node.file === subcanvasPath) node.file = here;
    else if (node.type === 'text') {
      node.text = library.relinkText(node.text, hits, toLink);
    }
  }
}

module.exports = relinkCanvasData;
