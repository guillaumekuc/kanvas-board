const entityNodes = require('./entityNodes.js');

module.exports = {
  meta: {
    type: 'suggestion',
    docs: { description: 'One function or class per file' },
    schema: [],
  },
  create(context) {
    return {
      Program(program) {
        const entities = program.body.flatMap(entityNodes);
        for (const extraEntity of entities.slice(1)) {
          context.report({
            node: extraEntity,
            message: `File holds ${entities.length} entities; keep one per file.`,
          });
        }
      },
    };
  },
};
