const rateName = (windowMinutes) =>
  // APM extended to the window: AP15M
  windowMinutes === 1 ? 'APM' : `AP${windowMinutes}M`;

module.exports = rateName;
