const selectedCards = require('../selectedCards.js');

function registerSelectSameTagCommand(plugin) {
  function tagsOf(selection) {
    return new Set(
      selectedCards(selection).flatMap((node) => [...plugin.cardTagSet(node)]),
    );
  }
  plugin.addCanvasCommand('select-same-tag', 'Select cards with the same tag', {
    menu: ['Select same tag', 'tag'],
    test: (canvas, selection) => tagsOf(selection).size > 0,
    run: (canvas, selection) => {
      const tags = tagsOf(selection);
      plugin.selectMore(canvas, selection, (node) =>
        [...plugin.cardTagSet(node)].some((tag) => tags.has(tag)),
      );
    },
  });
}

module.exports = registerSelectSameTagCommand;
