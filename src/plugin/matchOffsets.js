

// Offsets of `query` in `text`, ignoring case.
function matchOffsets(text, query) {
	const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
	return Array.from(text.matchAll(re), m => m.index);
}

module.exports = matchOffsets;
