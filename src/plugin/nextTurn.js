

// The icon's next rotation for a direction: the shortest way there, so cycling keeps turning the same way.
const nextTurn = (current, target) => current + ((target - current) % 360 + 540) % 360 - 180;

module.exports = nextTurn;
