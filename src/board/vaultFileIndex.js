const { SKIP_DIRS } = require('./constants.js');
const vaultPath = require('./vaultPath.js');
const fileSystem = require('fs');
const path = require('path');
const settings = require('./settings.js');

// Singleton: one walk of the vault per process, shared by every lookup.
class VaultFileIndex {
  constructor() {
    this.files = null;
  }

  get(name) {
    return this.load().get(name) || null;
  }

  paths() {
    return new Set(this.load().values());
  }

  load() {
    if (!this.files) {
      this.files = new Map();
      const skip = new Set([...SKIP_DIRS, ...(settings().skipFolders || [])]);
      const walk = (folder) => {
        for (const entry of fileSystem.readdirSync(vaultPath(folder), {
          withFileTypes: true,
        })) {
          if (entry.isDirectory()) {
            if (!skip.has(entry.name)) {
              walk(path.posix.join(folder, entry.name));
            }
            continue;
          }
          const relativePath = path.posix.join(folder, entry.name);
          const key = entry.name.endsWith('.md')
            ? entry.name.slice(0, -3)
            : entry.name;
          if (!this.files.has(key)) this.files.set(key, relativePath);
          this.files.set(relativePath, relativePath);
          this.files.set(relativePath.replace(/\.md$/, ''), relativePath);
        }
      };
      walk('');
    }
    return this.files;
  }
}

module.exports = new VaultFileIndex();
