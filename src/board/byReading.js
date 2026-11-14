function byReading(first, second) {
  return first.y - second.y || first.x - second.x;
}

module.exports = byReading;
