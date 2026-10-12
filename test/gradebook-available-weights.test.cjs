const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const teacher = fs.readFileSync(path.join(__dirname, '../js/teacher.js'), 'utf8');
const analytics = fs.readFileSync(path.join(__dirname, '../js/sigma-analytics.js'), 'utf8');
const start = teacher.indexOf('    function calculateWeightedInitialGrade(parts)');
const context = vm.createContext({});
vm.runInContext(teacher.slice(start, teacher.indexOf('    function formatInitialGrade', start)), context);
const sharedStart = analytics.indexOf('                let initialGrade = null;', analytics.indexOf('const wwDisplay ='));
const sharedEnd = analytics.indexOf('                const initialDisplay', sharedStart);
for (const [values, expected] of [[[(115 / 155) * 100, null, null], (115 / 155) * 100 * 0.3], [[80, 90, null], 69], [[80, 90, 70], 83], [[0, null, null], 0], [[80, 0, null], 24], [[null, null, null], null]]) {
    const weights = [0.3, 0.5, 0.2];
    const result = context.calculateWeightedInitialGrade(values.map((value, i) => ({ value, weight: weights[i] })));
    const shared = { wwVal: values[0], ptVal: values[1], qaVal: values[2], wwWeight: weights[0], ptWeight: weights[1], qaWeight: weights[2] };
    vm.runInNewContext(analytics.slice(sharedStart, sharedEnd) + 'this.result = initialGrade;', shared);
    if (expected === null) { assert.equal(result, null); assert.equal(shared.result, null); }
    else { assert.ok(Math.abs(result - expected) < 1e-8); assert.ok(Math.abs(shared.result - expected) < 1e-8); }
}
console.log('PASS: fixed weights retained, intermediate precision preserved, missing components skipped and recorded zero included');
