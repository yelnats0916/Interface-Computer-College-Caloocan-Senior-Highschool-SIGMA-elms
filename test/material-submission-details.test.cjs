const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/shared-components.js'), 'utf8');
const start = source.indexOf('        const hasSelectedSubmissionStudent =');
const end = source.indexOf('        let isGraded', start);
for (const [role, curStudent, isSubmitted, isViewSubmissionMode, expected] of [
    ['student', '', false, false, false],
    ['student', '', true, false, true],
    ['student', '', false, true, true],
    ['teacher', 'All', true, false, false],
    ['teacher', 'Juan', true, false, true],
    ['admin', 'Juan', true, false, true],
    ['teacher', 'Juan', false, false, false]
]) {
    assert.equal(vm.runInNewContext(source.slice(start, end) + '\nshowSubmissionHistoryDetails',
        { role, curStudent, isSubmitted, isViewSubmissionMode }), expected);
}
console.log('PASS: materials show history after submission, and staff need a selected student.');
