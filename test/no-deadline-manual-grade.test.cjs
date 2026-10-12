const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/shared-components.js'), 'utf8');
const store = new Map();
const localStorage = { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) };
const task = { id: 'task1', title: 'Task', maxScore: 100, topicIdx: 0, topicItemIdx: 0 };
let accepted = false;
const window = {
    openAskingPanel: options => { if (accepted) options.onConfirm(); },
    _getTeacherGradebookCached: () => ({ scores: JSON.parse(localStorage.getItem('sigma-teacher-gradebook-scores-v2') || '{}'), statuses: {} }),
    getUnifiedSubjectAliases: subject => [subject],
    getCategoryDetails: category => category === 'assignment' ? [task] : [],
    getUnifiedSectionStudents: () => [{ id: 'student1', name: 'Student One' }],
    findAssessmentSubmittedWork: () => null,
    submissionSectionKey: section => section.toLowerCase(),
    refreshAllScorePanelsAndTables: () => {},
    getCurrentTopicAssessment: () => task,
    getLoggedInStudentUser: () => ({ id: 'student1', section: 'Rizal' }),
    switchTopicTab: () => {},
    _studentAssessmentDetailsCache: new Map()
};
const document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
const context = vm.createContext({ window, localStorage, document, console });
function load(name) {
    const start = source.indexOf(`window.${name} = function`);
    const end = source.indexOf('\nwindow.', start + 10);
    vm.runInContext(source.slice(start, end), context);
}
for (const name of ['resolveNoDeadlineAssessment', 'assessmentClosureKey', 'readAssessmentClosure', 'reopenGradedAssessment', 'isStudentAssessmentClosed', 'syncSharedScoreAndStatus']) load(name);
const args = { studentId: 'student1', studentName: 'Student One', subjectId: 'prog', section: 'Rizal', quarter: 1,
    category: 'assignment', itemIdx: 0, topicIdx: 0, topicItemIdx: 0, item: task, score: 0, status: 'missing', maxScore: 100 };
assert.equal(window.syncSharedScoreAndStatus({ ...args, score: '' }), null, 'Status without score is invalid');
assert.equal(window.syncSharedScoreAndStatus({ ...args, status: 'none' }), null, 'Score without MAIE status is invalid');
assert.equal(window.syncSharedScoreAndStatus(args), null);
assert.equal(store.size, 0, 'Cancel leaves grade and submission unchanged');
accepted = true;
const originalWrite = localStorage.setItem;
localStorage.setItem = (key, value) => {
    if (key === 'sigma-manual-grade-closures-v1') throw new Error('Storage full');
    originalWrite(key, value);
};
assert.throws(() => window.syncSharedScoreAndStatus({ ...args, manualCloseConfirmed: true }), /Storage full/);
assert.equal(store.size, 0, 'Failed closure write rolls grade writes back');
localStorage.setItem = originalWrite;
const saved = window.syncSharedScoreAndStatus({ ...args, manualCloseConfirmed: true });
assert.equal(saved.score, 0);
const classList = { add() {}, remove() {} };
const scoreInput = { dataset: { isQuiz: '1', hasQuizSubmission: '0', manualNoSubmission: '1' }, classList, style: {}, removeAttribute() {}, blur() {} };
const scoreDisplay = { classList, style: {} };
document.getElementById = id => id === 'teacher-grading-score-input' ? scoreInput : id === 'teacher-grading-score-display' ? scoreDisplay : null;
window.syncSharedScoreAndStatus({ ...args, source: 'score_panel', score: 42, manualCloseConfirmed: true });
assert.equal(scoreDisplay.textContent, '42', 'Post-save panel must retain an unsubmitted quiz grade');
assert.equal(scoreInput.dataset.savedScore, '42');
assert.equal(scoreInput.disabled, false);
document.getElementById = () => null;
const excused = window.syncSharedScoreAndStatus({ ...args, status: 'excuse', manualCloseConfirmed: true });
assert.equal(excused.score, 0, 'Excuse label preserves explicit zero');
assert.equal(window.readAssessmentClosure({ id: 'student1' }, task, 'prog', 'Rizal').score, 0);
assert.equal(window.readAssessmentClosure({ id: 'student2' }, task, 'prog', 'Rizal'), null);
window.getUnifiedSubjectAliases = () => ['prog', 'Computer Programming 1'];
window.getStudentFullAliases = () => ['student1'];
window.submissionSectionsMatch = (left, right) => left === 'rizal' && right === 'Grade 11 - Rizal';
assert.equal(window.readAssessmentClosure({ id: 'server-student', uid: 'student1' }, { materialId: 'task1' }, 'Computer Programming 1', 'Grade 11 - Rizal').score, 0);
window.getStudentFullAliases = undefined;
window.getUnifiedSubjectAliases = subject => [subject];
assert.equal(localStorage.getItem('sigma_student_assessment_submissions'), null, 'Manual grade must not create submitted work');
assert.equal([...store.keys()].some(key => key.startsWith('sigma_sub_')), false);
assert.equal(window.isStudentAssessmentClosed('prog', 0, 'assessments', 0), true);
window._manualGradeClosureContext = { key: window.assessmentClosureKey({ id: 'student1' }, task, 'prog', 'Rizal'), tab: 'assessments', activeIdx: 0 };
accepted = false;
const beforeReopen = [...store.entries()];
window.reopenGradedAssessment();
assert.deepEqual([...store.entries()], beforeReopen, 'Cancel reopening preserves grade and closure');
accepted = true;
window.reopenGradedAssessment();
assert.equal(window.isStudentAssessmentClosed('prog', 0, 'assessments', 0), false);
assert.ok(!localStorage.getItem('sigma-teacher-gradebook-scores-v2').includes(':0'), 'Reopen clears the saved zero');
const reopened = JSON.parse(localStorage.getItem('sigma-manual-grade-closures-v1'))[window._manualGradeClosureContext.key];
assert.equal(reopened.score, null);
assert.equal(reopened.status, 'none');
assert.equal(reopened.previousGrade.score, 0);
assert.equal(localStorage.getItem('sigma_student_assessment_submissions'), null);
task.dueDate = '2026-10-20';
assert.equal(window.resolveNoDeadlineAssessment(task, 'prog', 'Rizal'), null);
assert.equal(window.syncSharedScoreAndStatus({ ...args, studentId: 'student2' }), null, 'Deadline assessments remain submission locked');
console.log('PASS: cancellation, explicit zero, shared closure, student scoping, no fake attempts, reopening, deadline lock');
