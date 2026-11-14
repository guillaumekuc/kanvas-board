// Each scenario runs its commands in order on a fresh synthetic vault.
const BOARD = 'Board.canvas';

module.exports = {
  read: [['read', BOARD]],
  tree: [
    ['tree', BOARD],
    ['tree', BOARD, '--active'],
  ],
  check: [
    ['check', BOARD],
    ['check', BOARD, '--ids', 'wish0000000000a1,plan0000000000a3'],
  ],
  rollup: [
    ['rollup', BOARD],
    ['read', BOARD],
  ],
  set: [
    [
      'set',
      BOARD,
      'wish0000000000a1',
      '--color',
      'orange',
      '--text',
      'Renamed',
    ],
    [
      'set',
      BOARD,
      'ctx00000000000a5',
      '--file',
      'Projects/_assets/plans/Plan note.md',
    ],
  ],
  add: [
    [
      'add',
      BOARD,
      '--near',
      'wish0000000000a1',
      '--text',
      'New card',
      '--color',
      'yellow',
    ],
    [
      'add',
      BOARD,
      '--near',
      'nest0000000000a6',
      '--text',
      'Below',
      '--width',
      '300',
      '--height',
      '90',
    ],
  ],
  removeAndEdge: [
    ['remove', BOARD, 'ctx00000000000a5'],
    [
      'edge',
      BOARD,
      'wish0000000000a1',
      'brief000000000a2',
      '--label',
      'depends on',
    ],
  ],
  layout: [
    ['layout', BOARD, '--fit'],
    [
      'layout',
      BOARD,
      '--ids',
      'wish0000000000a1,brief000000000a2,plan0000000000a3',
      '--dir',
      'LR',
    ],
  ],
  packUnpack: [
    [
      'pack',
      BOARD,
      '--ids',
      'wish0000000000a1,brief000000000a2',
      '--name',
      'Packed',
    ],
    ['read', BOARD],
    ['unpack', BOARD, 'nest0000000000a6', '--keep'],
  ],
  unpackTrash: [['unpack', BOARD, 'nest0000000000a6']],
  mergeSplit: [
    ['merge', BOARD, '--ids', 'wish0000000000a1,brief000000000a2'],
    ['split', BOARD, 'para0000000000a8'],
    ['split', BOARD, 'ctx00000000000a5', '--by', 'bullet'],
  ],
  splitBullet: [['split', BOARD, 'para0000000000a8', '--by', 'bullet']],
  extract: [
    ['extract', BOARD, 'para0000000000a8', '--text', 'Second paragraph'],
  ],
  archiveRestore: [
    ['archive', BOARD, 'done0000000000a4,ctx00000000000a5'],
    ['restore', 'Board archive/Context card.md'],
    ['read', BOARD],
  ],
  errors: [
    [],
    ['bogus'],
    ['set', BOARD, 'missing', '--color', 'red'],
    ['read', 'Nope.canvas'],
  ],
};
