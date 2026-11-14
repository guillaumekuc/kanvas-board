

const noteName = text => (String(text).split('\n').find(l => l.trim()) || 'Card')
  .replace(/^\s*([>#]+\s*|([-*+]|\d+[.)])\s+(\[.\]\s+)?)/, '').replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2').replace(/[#^|[\]*_`>:\\/"?<]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60).trim() || 'Card';

module.exports = noteName;
