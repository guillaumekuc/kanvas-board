module.exports = {
  rules: {
    'boolean-prefix': require('./rules/booleanPrefix.js'),
    'one-entity-per-file': require('./rules/oneEntityPerFile.js'),
    'no-module-state': require('./rules/noModuleState.js'),
  },
};
