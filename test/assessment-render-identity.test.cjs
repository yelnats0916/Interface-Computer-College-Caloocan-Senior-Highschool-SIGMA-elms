const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/shared-components.js'), 'utf8');
const start = source.indexOf('        const submissionStudent = role ===');
const end = source.indexOf('\n        if (!subData && (submissionStudentId', start);
const calls = [];
const selected = { id: 'student-one', name: 'Student One' };
const window = {
    getLoggedInStudentUser: () => ({ id: 'other-student' }),
    resolveStudentAssessmentSubmissionDetails: (...args) => { calls.push(args); return { sub: { studentId: args[5].id } }; }
};
function render(role, studentObj) {
    const context = { window, role, studentObj, subData: null, ass: { id: 'task-one' }, subjectId: 'prog1', topicIdx: 0, activeIdx: 0, targetSection: 'Rizal' };
    vm.runInNewContext(source.slice(start, end), context);
    return context.subData;
}
assert.equal(render('teacher', null), null);
assert.equal(render('admin', null), null);
assert.equal(calls.length, 0, 'Teacher/admin overview must not resolve or mutate an anonymous student grade');
assert.equal(render('teacher', selected).studentId, selected.id);
assert.equal(calls.at(-1)[5], selected, 'Selected teacher student is passed explicitly instead of using a logged-in student');
assert.equal(render('student', null).studentId, 'other-student');
assert.equal(render('teacher', { name: 'Unknown Student' }), null);
console.log('PASS: assessment rendering resolves only identified students and keeps teacher selections scoped.');
