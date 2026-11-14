function rateName(windowMinutes) {
  return windowMinutes === 1 ? 'APM' : `AP${windowMinutes}M`;
}

module.exports = rateName;
