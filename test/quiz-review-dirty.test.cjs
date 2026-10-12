const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('js/shared-components.js', 'utf8');
const start = source.indexOf('    function isTeacherReviewDirty()');
const end = source.indexOf('    function updateTeacherGradingButtonState()', start);
const window = { location: { pathname: '/teacher.html', href: 'http://localhost/teacher.html' }, _isReviewDirty: false,
    _initialTeacherEssayScores: { 'qidx:0': '5' }, _teacherEssayScores: { 'qidx:0': 5 },
    _initialTeacherEssayGraded: {}, _teacherEssayGraded: { 'qidx:0': true } };
const context = vm.createContext({ window, _isStudentQuizReview: true, _isPendingReview: true });
vm.runInContext(source.slice(start, end), context);
assert.equal(vm.runInContext('isTeacherReviewDirty()', context), false, 'Viewing normalized scores or completed auto review is clean');
window._isReviewDirty = true;
assert.equal(vm.runInContext('isTeacherReviewDirty()', context), true, 'Explicit score edit still prompts');
window._isReviewDirty = false;
assert.equal(vm.runInContext('isTeacherReviewDirty()', context), false, 'Saved or discarded changes are clean');
console.log('PASS: viewing quiz scores is clean; explicit review edits remain protected.');
