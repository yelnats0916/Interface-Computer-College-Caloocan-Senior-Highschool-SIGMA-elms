const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/shared-components.js'), 'utf8');
const start = source.indexOf('    if (taskTitle && typeof window.getCategoryDetails');
const end = source.indexOf('    let items = [];', start);
for (const [category, expected] of [['perf. task', 'pt'], ['qa', 'qa'], ['ww', 'ww']]) {
    const result = vm.runInNewContext(`let targetView = 'ww';\n${source.slice(start, end)}\ntargetView`, {
        taskTitle: 'Assessment A', currentQ: 1, finalSubject: 'prog1', finalSection: 'Rizal',
        window: { getCategoryDetails: candidate => candidate === category ? [{ title: 'Assessment A' }] : [] }
    });
    assert.equal(result, expected);
}
console.log('PASS: View Gradebook resolves PT, QA and WW from the assessment component, not its generic task type.');
