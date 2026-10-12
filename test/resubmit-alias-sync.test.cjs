const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/shared-components.js'), 'utf8');
const start = source.indexOf('window.isQuizResubmissionRestricted =');
const end = source.indexOf('window.getAssessmentMaxAttempts =', start);
const values = new Map();
const window = {
    getStudentFullAliases: student => student.id === 'other' ? ['other'] : ['2222222', 'std-2222222', 'Dela Cruz, Juan Abad'],
    getUnifiedSubjectAliases: () => ['card-prog1', 'prog1', 'Computer Programming 1', 'computer programming 1']
};
vm.runInNewContext(source.slice(start, end), { window, localStorage: { getItem: key => values.get(key) ?? null } });
values.set('sigma_extra_attempts_Dela Cruz, Juan Abad_Computer Programming 1_0_assessments_2', '1');
assert.equal(window.getAssessmentExtraAttempts('card-prog1', 0, 'assessments', 2, { id: 'std-2222222', lrn: '2222222' }, { extraAttempts: 0 }), 1);
assert.equal(window.getAssessmentExtraAttempts('card-prog1', 0, 'assessments', 2, { id: 'other' }), 0);
assert.equal(window.getAssessmentExtraAttempts('card-prog1', 0, 'assessments', 1, { id: 'std-2222222' }), 0);
for (const key of window.getAssessmentExtraAttemptKeys('Computer Programming 1', 0, 'assessments', 2, { name: 'Dela Cruz, Juan Abad' })) values.set(key, '0');
assert.equal(window.getAssessmentExtraAttempts('card-prog1', 0, 'assessments', 2, { id: 'std-2222222' }, { extraAttempts: 1 }), 0);
console.log('PASS: retake grant resolves student/subject aliases, ignores stale zero, isolates students and assessments, and supports undo.');
