const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/shared-components.js'), 'utf8');
const start = source.indexOf('        const selectionScope =');
const end = source.indexOf('        let curStudentName =', start);
const context = { subjectId: 'prog', topicIdx: 0, activeIdx: 1 };
for (const explicit of [false, true]) {
    const state = { selectedStudent: 'Student Name' };
    const window = { _explicitGradingStudentSelection: explicit ? { scope: JSON.stringify(['prog', 0, 1, 'Rizal']), name: 'Student Name' } : null };
    vm.runInNewContext(source.slice(start, end), { window, submissionContext: context, section: 'Rizal', allStudents: [], topicState: state });
    assert.equal(state.selectedStudent, explicit ? 'Student Name' : 'All');
}
assert.ok(source.includes('const details = (!isEmptySelection'));
console.log('PASS: empty grading clears inherited identity but preserves explicitly selected non-submitters');
