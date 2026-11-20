const fileSystem = require('fs');
const path = require('path');

// Every file under root except .obsidian, as { relative path: content }.
function readTree(root, directory = '') {
  const snapshot = {};
  for (const entry of fileSystem.readdirSync(path.join(root, directory), {
    withFileTypes: true,
  })) {
    const relativePath = path.posix.join(directory, entry.name);
    if (relativePath === '.obsidian') {
      continue;
    }
    if (entry.isDirectory()) {
      Object.assign(snapshot, readTree(root, relativePath));
    } else {
      snapshot[relativePath] = fileSystem.readFileSync(
        path.join(root, relativePath),
        'utf8',
      );
    }
  }

  return snapshot;
}

module.exports = readTree;
