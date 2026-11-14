function isTwoWay(edge) {
  return edge.fromEnd === 'arrow' && edge.toEnd !== 'none';
}

module.exports = isTwoWay;
