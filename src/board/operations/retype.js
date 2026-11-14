const OTHER_TYPE = { file: 'text', text: 'file' };

// Makes the card a `type` card holding `value`; true when its type changed.
function retype(node, type, value) {
  const isRetyped = node.type !== type;
  node.type = type;
  node[type] = value;
  delete node[OTHER_TYPE[type]];
  return isRetyped;
}

module.exports = retype;
