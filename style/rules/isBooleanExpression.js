const BOOLEAN_OPERATORS = new Set(['===', '!==', '==', '!=', '<', '>', '<=', '>=', 'instanceof', 'in']);

module.exports = function isBooleanExpression(node) {
  if (!node) return false;
  if (node.type === 'Literal') return typeof node.value === 'boolean';
  if (node.type === 'UnaryExpression') return node.operator === '!';
  if (node.type === 'BinaryExpression') return BOOLEAN_OPERATORS.has(node.operator);
  if (node.type !== 'LogicalExpression') return false;
  return isBooleanExpression(node.left) && isBooleanExpression(node.right);
};
