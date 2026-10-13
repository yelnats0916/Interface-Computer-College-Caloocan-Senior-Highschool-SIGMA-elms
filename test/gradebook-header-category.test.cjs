const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/sigma-analytics.js'), 'utf8');
const start = source.indexOf('const itCat =', source.indexOf('let taskHeadersHtml'));
const end = source.indexOf(';', start) + 1;
const declaration = source.slice(start, end);
for (const [detailCategory, itemCategory, expected] of [
    ['perf. task', 'assignment', 'perf. task'],
    ['qa', 'assignment', 'qa'],
    ['ww', 'assignment', 'assignment'],
    ['ww', 'quiz', 'quiz']
]) {
    const actual = vm.runInNewContext(`${declaration}\nitCat`, { detailCategory, it: { category: itemCategory } });
    assert.equal(actual, expected);
}
console.log('PASS: gradebook header category resolves without an undefined variable and preserves PT/QA/WW routing.');
