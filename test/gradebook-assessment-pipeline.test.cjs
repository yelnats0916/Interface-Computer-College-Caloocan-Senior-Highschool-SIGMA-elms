const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/shared-components.js'), 'utf8');
const load = (name, context) => {
    const start = source.indexOf(`window.${name} = function`);
    vm.runInContext(source.slice(start, source.indexOf('\n};', start) + 4), context);
};
for (const portal of ['admin', 'teacher']) {
    const task = { id: 'task-1', title: 'Task 1', type: 'task', max: 100 };
    const task2 = { id: 'task-2', title: 'Task 1', type: 'task', max: 100 };
    const quiz = { id: 'quiz-material-1', title: 'Quiz 1', type: 'quiz', quizId: 'QZ-9301', max: 55 };
    const combined = [task, task2, quiz];
    const topic = { assignments: [task, task2], quizzes: [quiz] };
    let opened;
    let reads = 0;
    const window = {
        sigmaGradesState: { activeQuarter: 1, selectedSubjectSection: { subject: 'Computer Programming 1', sectionName: 'Rizal' } },
        getTopicData: () => ({ q1Topics: [topic] }),
        getUnifiedTopicAssessments: (tab) => tab === 'quiz' ? [quiz] : tab === 'assignments' ? [task, task2] : combined,
        getStudentAssessmentReleaseStatus: () => ({ isPublished: true }),
        getUnifiedSectionStudents: () => [{ id: '2222222', name: 'Dela Cruz, Juan Abad' }],
        resolveAssessmentHPS: item => ({ points: item.max }),
        getUnifiedSubjectAliases: () => ['prog1'],
        getSharedAssessmentSubmissionsStorage: () => ({}),
        _getTeacherGradebookCached: () => ({ scores: {}, statuses: {} }),
        getStudentAssessmentSubmission: (subject, tab, slot, topicIdx, item) => {
            reads++;
            return item.id === quiz.id ? { quizId: quiz.quizId, score: 20, status: 'Pending', submittedAt: '2026-10-05' }
                : item.id === task.id ? { materialId: task.id, score: 70, teacherSaved: true, submittedAt: '2026-10-03' } : null;
        },
        isSubmissionMatchForStudent: () => true,
        openTopicContent: (...args) => { opened = args; }
    };
    const context = vm.createContext({ window, localStorage: { getItem: () => null }, console, _sharedCategoryDetailsCache: {} });
    ['readAssessmentSubmissionEarnedPoints', 'getAssessmentMatchIdentity', 'submissionMatchesAssessment', 'getAssessmentGradeStorageKeys', 'getAssessmentsForSubject', 'getCategoryDetails', 'getEffectiveAssessmentStatusAndScore', 'studentHasAssessmentSubmission', 'getGradebookStudentItemScore', 'openGradebookAssessment', 'withGradebookReadCache'].forEach(name => load(name, context));
    const columns = window.getCategoryDetails('ww', 1, 'Computer Programming 1', 'Rizal');
    assert.equal(window.submissionMatchesAssessment({ materialId: task.id, title: task.title }, task2), false, 'Matching titles cannot borrow a different material submission');
    assert.deepEqual(Array.from(columns, item => item.id).sort(), [task.id, task2.id, quiz.id].sort(), `${portal}: unique assessments retained even with duplicate titles`);
    const scores = window.withGradebookReadCache(() => columns.map(item => window.getGradebookStudentItemScore({ id: '2222222', name: 'Dela Cruz, Juan Abad' }, item._category, item.itemIdx, item, 'Computer Programming 1', 1)));
    assert.deepEqual(Array.from(scores), Array.from(columns, item => item.id === task.id ? 70 : item.id === quiz.id ? 20 : null), `${portal}: task and quiz category-local index zero do not collide`);
    assert.equal(scores.reduce((sum, value) => sum + (value || 0), 0), 90);
    for (const item of columns) {
        window.openGradebookAssessment(item._category, item.itemIdx, 'Computer Programming 1', 'Rizal');
        assert.equal(opened[3], combined.findIndex(row => row.id === item.id), `${portal}: ${item.id} opens its combined-list submission index`);
        assert.equal(opened[5].viewSubmission, true);
        assert.equal(opened[5].selectedSection, 'Rizal');
    }
    const old = opened;
    window.openGradebookAssessment('quiz', 99, 'Computer Programming 1', 'Rizal');
    assert.equal(opened, old, 'Unknown column does not fall back to another category');
    assert.ok(reads < 10, 'Submission scanning remains bounded to selected assessments');
    const portalSource = fs.readFileSync(path.join(__dirname, `../js/${portal}.js`), 'utf8');
    assert.match(portalSource, /window\.navigateToAssessmentFromGradebook = function \(\.\.\.args\) \{\s*return window\.openGradebookAssessment\(\.\.\.args\);/, 'Portal navigation delegates to shared implementation');
}
console.log('PASS: real column builder feeds isolated task/quiz scores and identity-based submission routes in both portals.');
