const fileSystem = require('fs');
const path = require('path');

function settings() {
  try {
    return JSON.parse(
      fileSystem.readFileSync(path.join(__dirname, 'data.json'), 'utf8'),
    );
  } catch (error) {
    return {};
  }
}

module.exports = settings;
