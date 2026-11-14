const COLUMN_WIDTH = 400;
const STEPS_X = COLUMN_WIDTH + 160;

// Legend cards stay uncolored (a colored one would be state: a pass would
// take the cyan and purple ones), an emoji dot stands for the color.
const DOT = {
  cyan: '🔵',
  purple: '🟣',
  orange: '🟠',
  yellow: '🟡',
  red: '🔴',
  green: '🟢',
  none: '⚪',
};

const STEPS = [
  '**1. Write a wish**\nOne card, one thing you want done, in your own words. Uncolored cards are ideas: the agent never touches them.',
  '**2. Color it**\nCyan: the agent carries it to done. Purple: one step (a brief, then a plan), then it hands back. Color hotkeys: Settings > Kanvas board > Hotkeys.',
  '**3. Run a pass**\nCommand "Kanvas board: Run pass". A terminal opens with the agent on this board; it turns the cards it takes orange.',
  "**4. Answer**\nYellow: a question or a review for you, in the card's note. Answer there, color the card cyan or purple again, run the next pass.",
];

const TRY_IT =
  'Try it: color this card cyan, then run a pass.\n\n' +
  'Write a short note that explains this board in my own words.';

module.exports = { COLUMN_WIDTH, STEPS_X, DOT, STEPS, TRY_IT };
