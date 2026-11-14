// Counts violations per rule and per file: the size of the code quality pass.
const path = require('path');
const { ESLint } = require('eslint');
const countBy = require('./countBy.js');

(async () => {
  const results = await new ESLint().lintFiles(['.']);
  const messages = results.flatMap((result) =>
    result.messages.map((message) => ({
      ...message,
      file: path.basename(result.filePath),
    })),
  );
  const sections = [
    countBy(messages, (message) => message.ruleId),
    countBy(messages, (message) => message.file),
  ];
  console.log(`total ${messages.length}\n`);
  for (const entries of sections) {
    for (const [key, count] of entries) {
      console.log(`${String(count).padStart(5)}  ${key}`);
    }
    console.log('');
  }
})();
