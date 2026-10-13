const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/shared-components.js'), 'utf8');
const window = {};
vm.runInNewContext(source.slice(source.indexOf('window.isSubmissionMatchForStudent = function'),
    source.indexOf('window.removeAssessmentGradebookRecords = function')), { window });
for (const [saved, roster] of [['222222', '2222222'], ['2222222', 'std-222222']]) {
    assert.equal(window.isSubmissionMatchForStudent({ studentId: saved }, { id: roster }), true);
}
assert.equal(window.isSubmissionMatchForStudent({ studentId: '26010314', studentName: 'Juan' }, { id: '2222222', name: 'Juan' }), false);
assert.equal(window.isSubmissionMatchForStudent({ studentId: '22222222' }, { id: '2222222' }), false);
console.log('PASS: known legacy student aliases match; different IDs remain isolated.');
