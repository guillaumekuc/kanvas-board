import * as obsidian from 'obsidian';
import path from 'path';
import * as store from '../board/store.js';
import * as shared from './shared.js';

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
  '**1. Write a wish**\nOne card, one thing you want done, in ' +
    'your own words. Uncolored cards are ideas: the agent never ' +
    'touches them.',
  '**2. Color it**\nCyan: the agent carries it to done. Purple: ' +
    'one step (a brief, then a plan), then it hands back. Color ' +
    'hotkeys: Settings > Kanvas board > Hotkeys.',
  '**3. Run a pass**\nCommand "Kanvas board: Run pass". A ' +
    'terminal opens with the agent on this board; it turns the ' +
    'cards it takes orange.',
  '**4. Answer**\nYellow: a question or a review for you, in ' +
    "the card's note. Answer there, color the card cyan or purple " +
    'again, run the next pass.',
];

const TRY_IT =
  'Try it: color this card cyan, then run a pass.\n\n' +
  'Write a short note that explains this board in my own words.';

const STEP_HEIGHT = 160;

// The first steps, chained top to bottom, then a wish to try a pass on.
function firstStepsCanvas() {
  const group = {
    id: store.newId(),
    type: 'group',
    label: 'First steps',
    x: STEPS_X - 40,
    y: -80,
    width: COLUMN_WIDTH + 80,
    height: STEPS.length * STEP_HEIGHT + 280,
  };
  function card(text, row) {
    return {
      id: store.newId(),
      type: 'text',
      text,
      x: STEPS_X,
      y: row * STEP_HEIGHT,
      width: COLUMN_WIDTH,
      height: 130,
    };
  }
  const steps = [];
  const edges = [];
  for (const [row, text] of STEPS.entries()) {
    const step = card(text, row);
    const above = steps[steps.length - 1];
    steps.push(step);
    if (!above) {
      continue;
    }
    edges.push({
      id: store.newId(),
      fromNode: above.id,
      fromSide: 'bottom',
      toNode: step.id,
      toSide: 'top',
    });
  }
  const tryIt = {
    ...card(TRY_IT, STEPS.length),
    y: STEPS.length * STEP_HEIGHT + 20,
  };

  return { nodes: [group, ...steps, tryIt], edges };
}

// One card per color: its label and what it does (Settings > Workflow).
function legendNodes(colorLabel) {
  const group = {
    id: store.newId(),
    type: 'group',
    label: 'How the colors work',
    x: -40,
    y: -80,
    width: COLUMN_WIDTH + 80,
    height: shared.WORKFLOW.length * 100 + 100,
  };
  const cards = shared.WORKFLOW.map(({ name, meaning }, index) => {
    const colorName = shared.COLOR_NUM[name] ? name : 'uncolored';

    return {
      id: store.newId(),
      type: 'text',
      text: `${DOT[name]} **${colorLabel(name)}** (${colorName})\n${meaning}`,
      x: 0,
      y: index * 100,
      width: COLUMN_WIDTH,
      height: 80,
    };
  });

  return [group, ...cards];
}

// The default board when it does not exist yet, else "Starter board.canvas"
// next to it (numbered when taken).
function starterBoardPath(vault, defaultBoard) {
  if (!vault.getAbstractFileByPath(defaultBoard)) {
    return defaultBoard;
  }

  const parent = path.posix.dirname(defaultBoard);
  const folder = parent === '.' ? '' : `${parent}/`;
  for (let suffix = 1; ; suffix++) {
    const board =
      `${folder}Starter ` + `board${suffix > 1 ? ` ${suffix}` : ''}.canvas`;
    if (!vault.getAbstractFileByPath(board)) {
      return board;
    }
  }
}

// Onboarding: a legend group and a group of first steps, one of them a wish
// to color cyan and run a pass on. Opens it.
async function createStarterBoard(plugin) {
  const { vault } = plugin.app;
  const board = starterBoardPath(vault, plugin.settings.defaultBoard);
  const legend = legendNodes((name) => plugin.colorLabel(name));
  const { nodes, edges } = firstStepsCanvas();
  const content = JSON.stringify(
    { nodes: [...legend, ...nodes], edges },
    null,
    '\t',
  );
  try {
    const folder = path.posix.dirname(board);
    if (folder !== '.' && !vault.getAbstractFileByPath(folder)) {
      await vault.createFolder(folder);
    }
    const file = await vault.create(board, content);
    await plugin.app.workspace.getLeaf(false).openFile(file);
    new obsidian.Notice(`Kanvas board: starter board created (${board})`);
  } catch (error) {
    new obsidian.Notice(
      `Kanvas board: could not create the starter board (${error.message})`,
    );
  }
}

export { firstStepsCanvas, legendNodes, starterBoardPath, createStarterBoard };
