const RED = '1';
const YELLOW = '3';
const GREEN = '4';

function colorCounts(colors) {
  function count(color) {
    return colors.filter((each) => each === color).length;
  }
  return {
    red: count(RED),
    yellow: count(YELLOW),
    allGreen: colors.length > 0 && count(GREEN) === colors.length,
  };
}

module.exports = colorCounts;
