const { SKIP_DIRS } = require('./constants.js');
const abs = require('./abs.js');
const fs = require('fs');
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
      const walk = dir => {
        for (const e of fs.readdirSync(abs(dir), { withFileTypes: true })) {
          if (e.isDirectory()) { if (!skip.has(e.name)) walk(path.posix.join(dir, e.name)); continue; }
          const rel = path.posix.join(dir, e.name);
          const key = e.name.endsWith('.md') ? e.name.slice(0, -3) : e.name;
          if (!this.files.has(key)) this.files.set(key, rel);
          this.files.set(rel, rel);
          this.files.set(rel.replace(/\.md$/, ''), rel);
        }
      };
      walk('');
    }
    return this.files;
  }
}

module.exports = new VaultFileIndex();
