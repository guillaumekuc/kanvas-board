const byReading = require('./byReading.js');

// The first card in reading order, else the first node (all groups).
function firstInReading(nodes) {
  return (
    nodes.filter((node) => node.type !== 'group').sort(byReading)[0] || nodes[0]
  );
}

module.exports = firstInReading;
