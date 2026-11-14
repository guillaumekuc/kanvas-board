const { CONTENT_KEYS } = require('./constants.js');

const cardsOf = (json) => {
  const map = new Map();
  for (const node of JSON.parse(json || '{}').nodes || []) {
    map.set(
      node.id,
      JSON.stringify(CONTENT_KEYS.map((key) => node[key] ?? null)),
    );
  }
  return map;
};

module.exports = cardsOf;
