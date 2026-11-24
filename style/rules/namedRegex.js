// A regex is a named const (`const FRONTMATTER = /^---.../`), never inline:
// the name says what it matches.
function isRegExpCall(node) {
  return (
    (node.type === 'NewExpression' || node.type === 'CallExpression') &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'RegExp'
  );
}

function isNamed(node) {
  const parent = node.parent;

  return (
    parent.type === 'VariableDeclarator' &&
    parent.init === node &&
    parent.parent.kind === 'const'
  );
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Regexes are named consts, not inline literals' },
    schema: [],
  },
  create(context) {
    function check(node) {
      if (!isNamed(node)) {
        context.report({
          node,
          message: 'Name this regex: const NAME = /.../ (what it matches).',
        });
      }
    }

    return {
      Literal(node) {
        if (node.regex) {
          check(node);
        }
      },
      NewExpression(node) {
        if (isRegExpCall(node)) {
          check(node);
        }
      },
      CallExpression(node) {
        if (isRegExpCall(node)) {
          check(node);
        }
      },
    };
  },
};
