// An archive note (made by Archive) keeps where its card came from.
function isArchiveNote(app, file) {
  if (!file || file.extension !== 'md') return false;
  const { frontmatter } = app.metadataCache.getFileCache(file) || {};
  return Boolean(frontmatter && frontmatter['archived-from']);
}

module.exports = isArchiveNote;
