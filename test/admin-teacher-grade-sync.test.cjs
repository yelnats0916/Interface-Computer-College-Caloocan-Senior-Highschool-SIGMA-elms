const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const shared = fs.readFileSync(path.join(__dirname, '../js/shared-components.js'), 'utf8');
const analytics = fs.readFileSync(path.join(__dirname, '../js/sigma-analytics.js'), 'utf8');
const store = new Map();
const localStorage = {
    getItem: key => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
    removeItem: key => store.delete(key)
};
const items = [0, 1].map(itemIdx => ({ id: `task-${itemIdx}`, title: `Task ${itemIdx}`, category: 'assignment', itemIdx, topicIdx: itemIdx, topicItemIdx: 0, max: 100 }));
const window = {
    sigmaGradesState: { activeQuarter: 1, selectedSubjectSection: { subject: 'prog', sectionName: 'Rizal' } },
    getUnifiedSubjectAliases: subject => [subject],
    getCategoryDetails: category => category === 'assignment' ? items : [],
    getUnifiedSectionStudents: () => [{ id: 'student-1', name: 'Student One' }],
    submissionSectionKey: section => String(section).replace(/^grade\s*\d+\s*-?\s*/i, '').toLowerCase(),
    studentHasAssessmentSubmission: () => false,
    getSharedAssessmentSubmissionsStorage: () => JSON.parse(localStorage.getItem('sigma_student_assessment_submissions') || '{}'),
    getStudentAssessmentSubmission: () => null,
    refreshAllScorePanelsAndTables: () => {},
    clearCategoryDetailsCache: () => {}
};
const context = vm.createContext({ window, localStorage, console, document: { querySelector: () => null, querySelectorAll: () => [], getElementById: () => null }, gradebookScores: { prog: { 1: { 'sec:rizal': { 'student-1': { assignment: { 0: 5 } } } } } }, gradebookStatuses: {} });
function load(name, next) {
    const start = shared.indexOf(`window.${name} = function`);
    const end = shared.indexOf(`\n${next}`, start);
    assert(start >= 0 && end > start, name);
    vm.runInContext(shared.slice(start, end), context);
}
const cacheStart = shared.indexOf('let _sharedGbCache =');
const cacheEnd = shared.indexOf('window.invalidateSharedAssessmentSubmissionsStorage', cacheStart);
vm.runInContext(shared.slice(cacheStart, cacheEnd), context);
load('resolveGradebookScoreColumn', 'window.applyOfficialQuizScore');
load('syncSharedScoreAndStatus', 'window.');
load('getEffectiveAssessmentStatusAndScore', 'window.');
const readerStart = analytics.indexOf('    function getAdminGradebookStudentItemScore(');
const readerEnd = analytics.indexOf('    window.getAdminGradebookAssessmentItems', readerStart);
vm.runInContext(analytics.slice(readerStart, readerEnd), context);
const seed = { prog: { 1: { 'sec:rizal': { 'student-1': { assignment: { 0: 80 } } }, 'sec:newton': { 'student-1': { assignment: { 0: 30 } } } }, 2: { 'sec:rizal': { 'student-1': { assignment: { 0: 40 } } } } }, math: { 1: { 'sec:rizal': { 'student-1': { assignment: { 0: 55 } } } } } };
localStorage.setItem('sigma-teacher-gradebook-scores-v2', JSON.stringify(seed));
localStorage.setItem('sigma-teacher-gradebook-statuses-v2', '{}');
assert.equal(window._getTeacherGradebookCached(true).scores.prog[1]['sec:rizal']['student-1'].assignment[0], 80, 'Persisted score wins over stale teacher memory');
const student = { id: 'student-1', name: 'Student One' };
assert.equal(window.getAdminGradebookStudentItemScore(student, 'assignment', 0, items[0], 'prog', 1), 80);
assert.equal(window.getAdminGradebookStudentItemScore(student, 'assignment', 1, items[1], 'prog', 1), null, 'Topic-local index zero cannot borrow another task score');
function save(score, section = 'Rizal', subjectId = 'prog', quarter = 1) {
    window.syncSharedScoreAndStatus({ source: 'gradebook_table', studentId: student.id, studentName: student.name, subjectId, section, quarter, category: 'assignment', itemIdx: 0, topicIdx: 0, topicItemIdx: 0, item: items[0], score, status: 'none', maxScore: 100 });
}
save(90);
assert.equal(window.getAdminGradebookStudentItemScore(student, 'assignment', 0, items[0], 'prog', 1), 90, 'Admin edit is readable by the shared teacher reader');
save(60, 'Newton');
save(45, 'Rizal', 'prog', 2);
save(65, 'Rizal', 'math');
const saved = JSON.parse(localStorage.getItem('sigma-teacher-gradebook-scores-v2'));
assert.equal(saved.prog[1]['sec:rizal']['student-1'].assignment[0], 90);
assert.equal(saved.prog[1]['sec:newton']['student-1'].assignment[0], 60);
assert.equal(saved.prog[2]['sec:rizal']['student-1'].assignment[0], 45);
assert.equal(saved.math[1]['sec:rizal']['student-1'].assignment[0], 65);
assert.equal(saved.prog[1]['student-1'], undefined, 'No unscoped cross-section copy');
assert.equal(window.getSharedAssessmentSubmissionsStorage()['student-1']['prog_sec_rizal_mat_task-0'].score, 90);
assert.equal(window.getSharedAssessmentSubmissionsStorage()['student-1']['prog_sec_rizal_mat_task-0_q2'].score, 45);
window.syncSharedScoreAndStatus({ source: 'score_panel', studentId: student.id, studentName: student.name, subjectId: 'prog', section: 'Rizal', quarter: 1, category: 'assignment', itemIdx: 0, topicIdx: 0, topicItemIdx: 0, item: items[0], score: 0, status: 'incomplete', maxScore: 100 });
assert.equal(window.getAdminGradebookStudentItemScore(student, 'assignment', 0, items[0], 'prog', 1), 0, 'Score-panel edit including zero reaches admin without stale memory');
assert.equal(window.getEffectiveAssessmentStatusAndScore(student, 'assignment', 0, 'prog', 1, { ...items[0], section: 'Rizal' }).status, 'incomplete');
assert.equal(window.getAdminGradebookStudentItemScore(student, 'assignment', 1, items[1], 'prog', 1), null);
save(75, 'Grade 11 - Rizal');
assert.equal(window.getAdminGradebookStudentItemScore(student, 'assignment', 0, items[0], 'prog', 1), 75, 'Admin and teacher section label aliases share one record');
save(85, 'Rizal');
assert.equal(window.getEffectiveAssessmentStatusAndScore(student, 'assignment', 0, 'prog', 1, { ...items[0], section: 'Grade 11 - Rizal' }).score, 85);
console.log('PASS: shared admin/teacher writes, fresh reads, score-panel records, section/subject/quarter/assessment isolation');
