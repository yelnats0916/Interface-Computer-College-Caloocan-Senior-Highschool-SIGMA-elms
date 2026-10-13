const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../js/shared-components.js'), 'utf8');
const start = source.indexOf('    const rawScore = String(input.value');
const end = source.indexOf("    if (String(input.value || '').trim()", start);
for (const score of ['', '36']) {
    const cell = { dataset: { score, attendance: 'none' }, _gradebookOriginalHtml: '<span>-</span>', innerHTML: 'editor' };
    const input = { value: score, dataset: {} };
    const closed = vm.runInNewContext(`(function () { ${source.slice(start, end)} return false; })()`,
        { cell, input, window: {} });
    assert.equal(closed, undefined);
    assert.equal(cell.innerHTML, '<span>-</span>');
    assert.equal(input.dataset.committed, '1');
}
console.log('PASS: untouched empty or scored editors close without grade validation or persistence.');
