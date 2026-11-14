

const rateName = windowMinutes => windowMinutes === 1 ? 'APM' : `AP${windowMinutes}M`; // APM extended to the window: AP15M

module.exports = rateName;
