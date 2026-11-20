// Code quality pass: each rule maps to one of User's rules. Not automatable,
// so reviewed by hand: comments explain why, GoF patterns named.
const globals = require('globals');
const stylePlugin = require('./style/plugin.js');
const glossary = require('./style/glossary.js');
const terseNames = require('./style/terseNames.js');

module.exports = [
  { ignores: ['dagre.min.js', 'main.js', 'canvas.js', 'node_modules/**'] },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node, ...globals.browser },
    },
    plugins: { style: stylePlugin },
    rules: {
      // Descriptive names, not terse ones
      'id-length': [
        'error',
        { min: 3, exceptions: glossary, properties: 'never' },
      ],
      'id-denylist': ['error', ...terseNames],
      // camelCase
      camelcase: ['error', { properties: 'never' }],
      // Booleans: isX / hasX
      'style/boolean-prefix': 'error',
      // K&R braces, always explicit (no braceless if/for/while bodies)
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],
      curly: ['error', 'all'],
      // Function declarations, not functions stored in consts (arrows that
      // need the enclosing this stay arrows)
      'func-style': ['error', 'declaration'],
      // Tiny functions, 60-line cap
      'max-lines-per-function': [
        'error',
        { max: 60, skipBlankLines: true, skipComments: true },
      ],
      // Guard clauses / early returns
      'no-else-return': ['error', { allowElseIf: false }],
      'no-lonely-if': 'error',
      'max-depth': ['error', 2],
      // Deep modules grouped by feature: about 200-500 lines a file, never
      // past 1000
      'max-lines': [
        'error',
        { max: 1000, skipBlankLines: true, skipComments: true },
      ],
      // Avoid globals
      'no-implicit-globals': 'error',
      'no-global-assign': 'error',
      'style/no-module-state': 'error',
      // User's taste decisions: <= 3 parameters, 80 columns, semicolons
      'max-params': ['error', 3],
      'max-len': ['error', { code: 80, ignoreUrls: true }],
      semi: ['error', 'always'],
    },
  },
  // src/ is ES modules: imports at the top of the file, no require
  {
    files: ['src/**/*.js'],
    languageOptions: { sourceType: 'module' },
  },
];
