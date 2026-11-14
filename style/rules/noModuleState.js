module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'No mutable module-level variables (globals in all but name)',
    },
    schema: [],
  },
  create(context) {
    return {
      Program(program) {
        for (const statement of program.body) {
          if (
            statement.type !== 'VariableDeclaration' ||
            statement.kind === 'const'
          ) {
            continue;
          }
          context.report({
            node: statement,
            message:
              `Module-level '${statement.kind}' is shared mutable state; ` +
              `avoid globals.`,
          });
        }
      },
    };
  },
};
