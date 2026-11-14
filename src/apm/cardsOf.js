const { CONTENT_KEYS } = require('./constants.js');

const cardsOf = (json) => {
  const map = new Map();
  for (const n of JSON.parse(json || '{}').nodes || []) {map.set(n.id, JSON.stringify(CONTENT_KEYS.map((k) => n[k] ?? null)));}
  return map;
};

module.exports = cardsOf;
