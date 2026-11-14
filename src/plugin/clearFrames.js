function clearFrames(root) {
  for (const frame of root.querySelectorAll('.kanvas-board-find-text')) {
    const parent = frame.parentNode;
    frame.replaceWith(...frame.childNodes);
    parent.normalize();
  }
}

module.exports = clearFrames;
