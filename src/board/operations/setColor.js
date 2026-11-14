// An empty color means uncolored, which a canvas stores as no color field.
function setColor(node, color) {
  if (color) node.color = color;
  else delete node.color;
}

module.exports = setColor;
