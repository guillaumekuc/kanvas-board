const isBooleanExpression = require('./isBooleanExpression.js');

module.exports = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Boolean variables start with isX / hasX' },
    schema: [{ type: 'object', properties: { prefixes: { type: 'array' } } }],
  },
  create(context) {
    const prefixes = context.options[0]?.prefixes ?? ['is', 'has'];
    const prefixPattern = new RegExp(`^(${prefixes.join('|')})[A-Z]`);
    function reportBareName(identifier) {
      if (prefixPattern.test(identifier.name)) return;
      context.report({
        node: identifier,
        message:
          `Boolean '${identifier.name}' should start with ` +
          `${prefixes.join(' / ')}.`,
      });
    }
    return {
      VariableDeclarator(declarator) {
        if (declarator.id.type !== 'Identifier') return;
        if (isBooleanExpression(declarator.init)) reportBareName(declarator.id);
      },
      AssignmentPattern(pattern) {
        if (pattern.left.type !== 'Identifier') return;
        if (isBooleanExpression(pattern.right)) reportBareName(pattern.left);
      },
    };
  },
};
