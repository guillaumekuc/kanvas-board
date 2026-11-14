function isTextNode(node) {
  return node.getData().type === 'text';
}

module.exports = isTextNode;
