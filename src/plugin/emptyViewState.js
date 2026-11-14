// What a canvas shows: colors and tags filtered out (x = excluded), cards
// hidden.
function emptyViewState() {
  return { xcolors: new Set(), xtags: new Set(), hidden: new Set() };
}

module.exports = emptyViewState;
