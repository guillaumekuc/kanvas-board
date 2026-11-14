const obsidianEval = require('./obsidianEval.js');

// Calls the plugin API inside Obsidian. 'closed' = board not open there; null = Obsidian not reachable.
const api = (fn, ...a) =>
  obsidianEval(
    `(async()=>{const p=app.plugins.plugins['canvas-board'];if(!p||!p.api)return 'no plugin';` +
      `const r=await p.api.${fn}(${a.map((x) => JSON.stringify(x)).join(',')});return r===null?'closed':r})()`,
  );

module.exports = api;
