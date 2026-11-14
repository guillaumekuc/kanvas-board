

const ORANGE_STALE_MS = 3600000;
const DEFAULT_PASS_COLORS = 'cyan purple';
const DEFAULT_NOTES_FOLDER = 'Board notes';
const WORKING = '2'; // orange: a pass is on the card
const WAITING = new Set(['1', '3']); // red, yellow: needs the human

module.exports = { ORANGE_STALE_MS, DEFAULT_PASS_COLORS, DEFAULT_NOTES_FOLDER, WORKING, WAITING };
