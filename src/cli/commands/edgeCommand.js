const { SIDES } = require('../../board/constants.js');
const defaultDir = require('../../board/defaultDir.js');
const newId = require('../../board/newId.js');
const writeOps = require('../../board/writeOps.js');

// A "depends on" edge points at the prerequisite, against the flow.
function edgeCommand(cli) {
  const label = cli.option('--label');
  const [flowFrom, flowTo] = SIDES[defaultDir()];
  const isAgainstFlow = /depends on/i.test(label || '');
  const [fromSide, toSide] = isAgainstFlow
    ? [flowTo, flowFrom]
    : [flowFrom, flowTo];
  const [fromNode, toNode] = cli.rest;
  const edge = { id: newId(), fromNode, fromSide, toNode, toSide };
  if (label) edge.label = label;
  console.log(writeOps(cli.board, [{ op: 'edge', edge }]));
}

module.exports = edgeCommand;
