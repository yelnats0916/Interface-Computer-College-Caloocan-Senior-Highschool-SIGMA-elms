const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/sigma-analytics.js'), 'utf8');
assert.match(source, /<span class="more-label">Show More<\/span>/);
assert.match(source, /moreLabel.textContent = 'Show More'/);
assert.match(source, /moreLabel.textContent = 'Show Less'/);
assert.equal(source.includes("moreLabel.textContent = 'More'"), false);
console.log('Expansion controls consistently use Show More and Show Less');
