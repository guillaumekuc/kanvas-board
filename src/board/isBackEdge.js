// The direction names where a branch starts, whichever way its arrows point.
// With flow 'in' (the fold direction) arrows point at the card they hang
// from, and "depends on" edges point at the prerequisite: both come first,
// so they rank reversed.
function isBackEdge(edge, flow) {
  return flow === 'in' || /depends on/i.test(edge.label || '');
}

module.exports = isBackEdge;
