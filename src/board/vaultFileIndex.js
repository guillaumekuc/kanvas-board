const { SKIP_DIRS } = require('./constants.js');
const vaultPath = require('./vaultPath.js');
const fileSystem = require('fs');
const path = require('path');
const settings = require('./settings.js');

// Singleton: one walk of the vault per process, shared by every lookup. A
// file is found by its path, its path without .md, or its name.
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
      this.skipped = new Set([...SKIP_DIRS, ...(settings().skipFolders || [])]);
      this.walk('');
    }
    return this.files;
  }

  walk(folder) {
    const entries = fileSystem.readdirSync(vaultPath(folder), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      const relativePath = path.posix.join(folder, entry.name);
      if (!entry.isDirectory()) this.add(relativePath, entry.name);
      else if (!this.skipped.has(entry.name)) this.walk(relativePath);
    }
  }

  // The first file found keeps a name shared by several.
  add(relativePath, name) {
    const key = name.endsWith('.md') ? name.slice(0, -3) : name;
    if (!this.files.has(key)) this.files.set(key, relativePath);
    this.files.set(relativePath, relativePath);
    this.files.set(relativePath.replace(/\.md$/, ''), relativePath);
  }
}

module.exports = new VaultFileIndex();
