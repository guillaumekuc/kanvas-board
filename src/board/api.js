const obsidianEval = require('./obsidianEval.js');

// Calls the plugin API inside Obsidian. 'closed' = board not open there; null = Obsidian not reachable.
const api = (method, ...values) =>
  obsidianEval(
    `(async()=>{const p=app.plugins.plugins['canvas-board'];if(!p||!p.api)return 'no plugin';` +
      `const r=await p.api.${method}(${values.map((x) => JSON.stringify(x)).join(',')});return r===null?'closed':r})()`,
  );

module.exports = api;
