// Functions read as blocks: guard clauses, setup, core logic, return, with a
// blank line between blocks. The rule checks the two edges it can see: after
// the leading guard clauses and before the final return.
const FUNCTION_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);
const EXIT_TYPES = new Set(['ReturnStatement', 'ThrowStatement']);

function exits(statement) {
  if (statement.type === 'BlockStatement') {
    return statement.body.length > 0 && exits(statement.body.at(-1));
  }

  return EXIT_TYPES.has(statement.type);
}

function isGuard(statement) {
  return (
    statement.type === 'IfStatement' &&
    !statement.alternate &&
    exits(statement.consequent)
  );
}

function guardCount(statements) {
  const index = statements.findIndex((statement) => !isGuard(statement));

  return index === -1 ? statements.length : index;
}

// The last token or comment on the line where `statement` ends (a trailing
// comment counts as part of it).
function lineEnd(sourceCode, statement) {
  let last = sourceCode.getLastToken(statement);
  let next = sourceCode.getTokenAfter(last, { includeComments: true });
  while (next && next.loc.start.line === last.loc.end.line) {
    last = next;
    next = sourceCode.getTokenAfter(last, { includeComments: true });
  }

  return { last, next };
}

function checkGap(context, statement, message) {
  const { last, next } = lineEnd(context.sourceCode, statement);
  if (!next || next.loc.start.line - last.loc.end.line > 1) {
    return;
  }

  context.report({
    node: statement,
    message,
    fix: (fixer) => fixer.insertTextAfter(last, '\n'),
  });
}

function checkBody(context, body) {
  if (!FUNCTION_TYPES.has(body.parent.type)) {
    return;
  }

  const statements = body.body;
  const guards = guardCount(statements);
  const finalIndex = statements.length - 1;
  const hasFinalReturn =
    finalIndex > 0 && statements[finalIndex].type === 'ReturnStatement';

  if (guards > 0 && guards < statements.length) {
    checkGap(
      context,
      statements[guards - 1],
      'Blank line after the guard clauses.',
    );
  }
  if (hasFinalReturn && finalIndex !== guards) {
    checkGap(
      context,
      statements[finalIndex - 1],
      'Blank line before the final return.',
    );
  }
}

module.exports = {
  meta: {
    type: 'layout',
    docs: {
      description: 'Blank lines between guards, setup/core logic and return',
    },
    fixable: 'whitespace',
    schema: [],
  },
  create(context) {
    return {
      BlockStatement: (node) => checkBody(context, node),
    };
  },
};
