const fs = require('fs');
const path = require('path');

const settings = () => {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8'),
    );
  } catch (e) {
    return {};
  }
};

module.exports = settings;
