module.exports = {
  rules: {
    'boolean-prefix': require('./rules/booleanPrefix.js'),
    'no-module-state': require('./rules/noModuleState.js'),
    'named-regex': require('./rules/namedRegex.js'),
    'namespace-import': require('./rules/namespaceImport.js'),
  },
};
