// Import a module whole, never cherry-picked names: `import * as pass from
// './pass.js'` then `pass.startPass()`, so every use says where it comes
// from. The same holds for `const { x } = require(...)`.
const MODULE_NAMES = {
  fs: 'fileSystem',
  os: 'operatingSystem',
  child_process: 'childProcess',
};
const FILE_EXTENSION = /\.[cm]?js$/;
const NAME_SEPARATOR = /[-_.]+(\w)/g;

function moduleName(source) {
  if (MODULE_NAMES[source]) {
    return MODULE_NAMES[source];
  }

  const base = source.split('/').pop().replace(FILE_EXTENSION, '');
  return base.replace(NAME_SEPARATOR, (_match, letter) => letter.toUpperCase());
}

function isRequireCall(node) {
  return (
    node &&
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'require' &&
    node.arguments.length === 1 &&
    node.arguments[0].type === 'Literal'
  );
}

function declaredNames(scope, names) {
  for (const variable of scope.variables) {
    names.add(variable.name);
  }
  for (const reference of scope.through) {
    names.add(reference.identifier.name);
  }
  for (const child of scope.childScopes) {
    declaredNames(child, names);
  }
  return names;
}

// A free name for the module: its own name, or `<name>Module` when the file
// already uses that name.
function freeName(sourceCode, source) {
  const name = moduleName(source);
  const names = declaredNames(sourceCode.scopeManager.globalScope, new Set());
  return names.has(name) ? `${name}Module` : name;
}

// The edit that points one use of an imported name at `qualified`
// (`namespace.importedName`); null when it cannot be rewritten.
function referenceFix(fixer, identifier, qualified) {
  const parent = identifier.parent;
  if (parent.type === 'ExportSpecifier') {
    return null;
  }

  const isShorthand =
    parent.type === 'Property' &&
    parent.shorthand &&
    parent.value === identifier;
  return fixer.replaceText(
    identifier,
    isShorthand ? `${identifier.name}: ${qualified}` : qualified,
  );
}

// The edits for every use of `variables` (imported name -> variable); null
// when one cannot be rewritten.
function referenceFixes(fixer, variables, namespace) {
  const fixes = [...variables].flatMap(([imported, variable]) =>
    variable.references
      .filter((reference) => !reference.init)
      .map((reference) =>
        referenceFix(fixer, reference.identifier, `${namespace}.${imported}`),
      ),
  );
  return fixes.includes(null) ? null : fixes;
}

function importVariables(sourceCode, node) {
  const variables = new Map();
  for (const specifier of node.specifiers) {
    const [variable] = sourceCode.getDeclaredVariables(specifier);
    variables.set(specifier.imported.name, variable);
  }
  return variables;
}

function requireVariables(sourceCode, declarator) {
  const isPlain = declarator.id.properties.every(
    (property) =>
      property.type === 'Property' && property.value.type === 'Identifier',
  );
  if (!isPlain) {
    return null;
  }

  const declared = sourceCode.getDeclaredVariables(declarator);
  const variables = new Map();
  for (const property of declarator.id.properties) {
    const variable = declared.find(
      (candidate) => candidate.name === property.value.name,
    );
    variables.set(property.key.name, variable);
  }
  return variables;
}

// Reports one cherry-picked import. `found` is { node, target, text,
// variables, source }: `target` is replaced by `text(namespace)`; no fix
// when `variables` is null.
function report(context, found) {
  context.report({
    node: found.node,
    message: 'Import the module whole (import * as name) and use name.member.',
    fix(fixer) {
      if (!found.variables) {
        return null;
      }

      const namespace = freeName(context.sourceCode, found.source);
      const fixes = referenceFixes(fixer, found.variables, namespace);
      if (!fixes) {
        return null;
      }

      return [fixer.replaceText(found.target, found.text(namespace)), ...fixes];
    },
  });
}

function isNamed(specifier) {
  return specifier.type === 'ImportSpecifier';
}

function checkImport(context, node) {
  if (!node.specifiers.some(isNamed)) {
    return;
  }

  const isOnlyNamed = node.specifiers.every(isNamed);
  report(context, {
    node,
    target: node,
    text: (namespace) => `import * as ${namespace} from ${node.source.raw};`,
    variables: isOnlyNamed ? importVariables(context.sourceCode, node) : null,
    source: node.source.value,
  });
}

function checkRequire(context, node) {
  if (node.id.type !== 'ObjectPattern' || !isRequireCall(node.init)) {
    return;
  }

  report(context, {
    node,
    target: node.id,
    text: (namespace) => namespace,
    variables: requireVariables(context.sourceCode, node),
    source: node.init.arguments[0].value,
  });
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Import modules whole, not cherry-picked names' },
    fixable: 'code',
    schema: [],
  },
  create(context) {
    return {
      ImportDeclaration: (node) => checkImport(context, node),
      VariableDeclarator: (node) => checkRequire(context, node),
    };
  },
};
