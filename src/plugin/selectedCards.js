// The selected cards, without edges and groups.
function selectedCards(selection) {
  return selection.filter(
    (node) => !node.from && node.getData().type !== 'group',
  );
}

module.exports = selectedCards;
