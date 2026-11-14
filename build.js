// Bundles src/ into the two files Obsidian and the agent run:
// main.js (the plugin) and canvas.js (the CLI). Both are committed.
const esbuild = require('esbuild');

const BANNER = '// Built from src/ by `npm run build`; edit src/, not this file.';
const SHARED = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'es2022',
  banner: { js: BANNER },
  logLevel: 'warning',
};

esbuild.buildSync({
  ...SHARED,
  entryPoints: ['src/plugin/main.js'],
  external: ['obsidian', 'electron'],
  outfile: 'main.js',
});
esbuild.buildSync({
  ...SHARED,
  entryPoints: ['src/cli/canvas.js'],
  outfile: 'canvas.js',
});
