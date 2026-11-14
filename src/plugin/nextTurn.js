// The icon's next rotation for a direction: the shortest way there, so cycling
// keeps turning the same way.
function nextTurn(current, target) {
  return current + ((((target - current) % 360) + 540) % 360) - 180;
}

module.exports = nextTurn;
