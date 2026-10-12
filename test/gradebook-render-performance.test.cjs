const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const shared = read('js/shared-components.js');
const start = shared.indexOf('window.withGradebookReadCache = function');
const end = shared.indexOf('\nwindow.calculateGradebookCategoryPercentage', start);
let aliasCalls = 0;
let dataCalls = 0;
let version = 1;
const originalAliases = subject => { aliasCalls++; return [subject]; };
const window = {
    getUnifiedSubjectAliases: originalAliases,
    _getTeacherGradebookCached: () => { dataCalls++; return { version }; }
};
vm.runInNewContext(shared.slice(start, end), { window });
window.withGradebookReadCache(() => {
    for (let i = 0; i < 500; i++) {
        window.getUnifiedSubjectAliases('programming');
        assert.equal(window._getTeacherGradebookCached().version, 1);
    }
    window.withGradebookReadCache(() => window.getUnifiedSubjectAliases('programming'));
});
assert.equal(aliasCalls, 1, '500 same-subject lookups share one read during a render');
assert.equal(dataCalls, 1, 'Gradebook snapshot read once per render');
assert.equal(window.getUnifiedSubjectAliases, originalAliases, 'Original readers restored');
version = 2;
window.withGradebookReadCache(() => assert.equal(window._getTeacherGradebookCached().version, 2));
assert.equal(dataCalls, 2, 'Next render sees updated scores');
window.withGradebookReadCache(() => {
    window._getTeacherGradebookCached();
    version = 3;
    assert.equal(window._getTeacherGradebookCached(true).version, 3);
    assert.equal(window._getTeacherGradebookCached().version, 3);
});
assert.throws(() => window.withGradebookReadCache(() => { throw Error('test failure'); }));
assert.equal(window._gradebookReadCacheActive, false, 'Failure does not leave cache enabled');
assert.equal(window.getUnifiedSubjectAliases, originalAliases);

const analytics = read('js/sigma-analytics.js');
const scoreStart = analytics.indexOf('    function getAdminGradebookStudentItemScore(');
const scoreEnd = analytics.indexOf('\n    window.getAdminGradebookStudentItemScore', scoreStart);
let submissionCalls = 0;
let effective = { teacherSaved: true, score: 80 };
const scoreWindow = {
    sigmaGradesState: { selectedSubjectSection: { sectionName: 'Rizal' } },
    studentHasAssessmentSubmission: () => { submissionCalls++; return true; },
    getEffectiveAssessmentStatusAndScore: () => effective,
    _getTeacherGradebookCached: () => ({ scores: {} }),
    readScorePanelPoints: () => 0
};
const ctx = vm.createContext({ window: scoreWindow, localStorage: { getItem: () => null } });
const sharedReaderStart = shared.indexOf('window.getGradebookStudentItemScore = function');
const sharedReaderEnd = shared.indexOf('\nwindow.calculateGradebookCategoryPercentage', sharedReaderStart);
vm.runInContext(shared.slice(sharedReaderStart, sharedReaderEnd), ctx);
vm.runInContext(analytics.slice(scoreStart, scoreEnd) + '\nwindow.readScore = getAdminGradebookStudentItemScore;', ctx);
const student = { id: '1001', name: 'Student' };
const item = { id: 'quiz-a', type: 'quiz', title: 'Quiz A' };
assert.equal(scoreWindow.readScore(student, 'quiz', 0, item, 'programming', 1), 80);
assert.equal(submissionCalls, 0, 'Saved scores do not trigger expensive submission scans');
effective = { teacherSaved: true, score: 0 };
assert.equal(scoreWindow.readScore(student, 'quiz', 0, item, 'programming', 1), 0);
assert.equal(submissionCalls, 0, 'Saved zero remains valid');
effective = { isFromSubmission: true, score: 55 };
assert.equal(scoreWindow.readScore(student, 'quiz', 0, item, 'programming', 1), 55);
assert.equal(submissionCalls, 1, 'Submission-derived scores still validated');
effective = {};
scoreWindow.readScore(student, 'quiz', 0, item, 'programming', 1);
assert.equal(submissionCalls, 2, 'Repeated fallback checks scan at most once per score lookup');
console.log('PASS: 500 repeated lookups reduced to 1 per render, fresh reads and forced refresh preserved, saved scores skip submission scans.');
