// A stand-in for any Obsidian object: every unknown member is a callable
// that returns another stand-in, so plugin code runs without the app.
function anything() {
  const assigned = new Map();

  return new Proxy(function stub() {}, {
    set: (target, key, value) => assigned.set(key, value),
    get: (target, key) => {
      if (assigned.has(key)) {
        return assigned.get(key);
      }
      if (key === Symbol.toPrimitive) {
        return () => '';
      }
      if (key === 'then') {
        return undefined;
      }
      if (key === Symbol.iterator) {
        return [][Symbol.iterator].bind([]);
      }
      if (key === 'length') {
        return 0;
      }

      return anything();
    },
    apply: () => anything(),
    construct: () => anything(),
  });
}

module.exports = anything;
