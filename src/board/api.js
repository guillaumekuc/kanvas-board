const obsidianEval = require('./obsidianEval.js');

const PLUGIN = "app.plugins.plugins['canvas-board']";

// Calls the plugin API inside Obsidian. 'closed' = board not open there;
// null = Obsidian not reachable.
function api(method, ...values) {
  const json = values.map((value) => JSON.stringify(value)).join(',');
  const call = `p.api.${method}(${json})`;
  return obsidianEval(
    `(async()=>{const p=${PLUGIN};if(!p||!p.api)return 'no plugin';` +
      `const r=await ${call};return r===null?'closed':r})()`,
  );
}

module.exports = api;
