const abs = require('./abs.js');
const fs = require('fs');

const readFileBoard = (board) => {
  const d = JSON.parse(fs.readFileSync(abs(board), 'utf8') || '{}');
  d.nodes ||= [];
  d.edges ||= [];
  return d;
};

module.exports = readFileBoard;
