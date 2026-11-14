const activeTree = require('../../workflow/activeTree.js');
const workflowTree = require('../../workflow/tree.js');

function treeCommand(cli) {
  const boardTree = workflowTree(cli.board);
  cli.print(cli.hasFlag('--active') ? activeTree(boardTree) : boardTree);
}

module.exports = treeCommand;
