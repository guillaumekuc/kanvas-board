// Writes a small synthetic vault: one board, a nested board, plan notes.
const fs = require('fs');
const path = require('path');

const FIXED_TIME = new Date('2026-01-14T12:00:00Z');

const card = (id, text, color, position) => ({
  id,
  type: 'text',
  text,
  x: position[0],
  y: position[1],
  width: 250,
  height: 60,
  ...(color ? { color } : {}),
});

const BOARD = {
  nodes: [
    card('wish0000000000a1', 'A cyan wish', '5', [0, 0]),
    card('brief000000000a2', '[[Brief note]] · 1 questions', '3', [300, 0]),
    card('plan0000000000a3', '[[Plan note]] · review plan', '6', [600, 0]),
    card('done0000000000a4', 'Shipped · done · [[Plan note]]', '4', [0, 200]),
    card('ctx00000000000a5', 'Context card', null, [300, 200]),
    card('nest0000000000a6', '[[Sub.canvas|Sub]]', null, [600, 200]),
    card('orng0000000000a7', 'Running elsewhere', '2', [0, 400]),
    card(
      'para0000000000a8',
      'First paragraph\n\nSecond paragraph\n\n- one\n- two',
      null,
      [300, 400],
    ),
    {
      id: 'grp00000000000a9',
      type: 'group',
      label: 'Group',
      x: -50,
      y: 350,
      width: 700,
      height: 200,
    },
  ],
  edges: [
    {
      id: 'edge000000000001',
      fromNode: 'wish0000000000a1',
      toNode: 'ctx00000000000a5',
    },
    {
      id: 'edge000000000002',
      fromNode: 'plan0000000000a3',
      toNode: 'brief000000000a2',
      label: 'depends on',
    },
  ],
};

const SUB = {
  nodes: [
    card('sub00000000000b1', 'Nested red', '1', [0, 0]),
    card('sub00000000000b2', 'Nested green', '4', [300, 0]),
  ],
  edges: [],
};

const NOTES = {
  'Projects/_assets/plans/Brief note.md':
    '---\ncontext:\n  - PD\n---\n## Aim\nA brief.\n### Done when\n- it works\n\n## Design\nx\n\n## Open questions\n- [?] Which way?\n',
  'Projects/_assets/plans/Plan note.md':
    '---\ncontext:\n  - PD\n---\n## Aim\nA plan.\n### Done when\n- done\n\n## Design\ny\n\n## Parts\n- [x] first\n- [ ] second\n',
};

module.exports = function writeFixture(vaultRoot, pluginSources) {
  const pluginDir = path.join(
    vaultRoot,
    '.obsidian',
    'plugins',
    'canvas-board',
  );
  fs.mkdirSync(pluginDir, { recursive: true });
  for (const [name, source] of Object.entries(pluginSources)) {
    fs.cpSync(source, path.join(pluginDir, name), { recursive: true });
  }
  fs.writeFileSync(path.join(pluginDir, 'data.json'), '{}');
  const files = {
    'Board.canvas': JSON.stringify(BOARD, null, '\t'),
    'Sub.canvas': JSON.stringify(SUB, null, '\t'),
    ...NOTES,
  };
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(vaultRoot, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
    fs.utimesSync(filePath, FIXED_TIME, FIXED_TIME);
  }
};
