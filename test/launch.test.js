const assert = require('assert');
const Module = require('module');

// pass.js also holds startPass, which needs Obsidian: stub it.
const resolve = Module._resolveFilename;
Module._resolveFilename = function resolveStub(request, ...rest) {
  if (request === 'obsidian') {
    return require.resolve('./plugin/obsidianStub.js');
  }
  return resolve.call(this, request, ...rest);
};
const { agentWords, terminalLaunch } = require('../src/plugin/pass.js');

const prompt = 'Run a Kanvas board pass on B.canvas: follow skill.md';

assert.deepStrictEqual(agentWords('codex', prompt), ['codex', prompt]);
assert.deepStrictEqual(agentWords('gemini -i {prompt}', prompt), [
  'gemini',
  '-i',
  prompt,
]);
assert.deepStrictEqual(agentWords('"C:/My Tools/agent.exe"', prompt), [
  'C:/My Tools/agent.exe',
  prompt,
]);
assert.strictEqual(agentWords('', prompt)[1], prompt);

const agent = ['codex', prompt];
const vars = { vault: 'D:/My Vault', board: 'B.canvas', agent };
assert.deepStrictEqual(
  terminalLaunch('term -d "{vault}" --title "pass {board}" {agent}', vars),
  ['term', ['-d', 'D:/My Vault', '--title', 'pass B.canvas', ...agent]],
);
assert.deepStrictEqual(terminalLaunch('term "{claude}"', vars), [
  'term',
  agent,
]);

console.log('launch: ok');
