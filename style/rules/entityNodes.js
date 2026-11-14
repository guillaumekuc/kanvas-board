const ENTITY_VALUES = new Set([
  'FunctionExpression',
  'ArrowFunctionExpression',
  'ClassExpression',
]);
const DECLARATIONS = new Set(['FunctionDeclaration', 'ClassDeclaration']);

module.exports = function entityNodes(statement) {
  if (DECLARATIONS.has(statement.type)) return [statement];
  if (statement.type !== 'VariableDeclaration') return [];
  return statement.declarations.filter((declarator) =>
    ENTITY_VALUES.has(declarator.init?.type),
  );
};
