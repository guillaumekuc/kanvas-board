module.exports = function countBy(items, keyOf) {
  const counts = {};
  for (const item of items) counts[keyOf(item)] = (counts[keyOf(item)] ?? 0) + 1;
  return Object.entries(counts).sort((left, right) => right[1] - left[1]);
};
