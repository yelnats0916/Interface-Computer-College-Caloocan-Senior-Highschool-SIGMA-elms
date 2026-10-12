const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/shared-components.js'), 'utf8');
const values = new Map();
const storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value),
    key: index => [...values.keys()][index], get length() { return values.size; } };
const student = { id: 'student-one', name: 'Student One', section: 'Rizal' };
const task = { id: 'task-one', title: 'Variable Declaration Practice', category: 'assignment', quarter: 1, section: 'Rizal', topicIdx: 0, topicItemIdx: 0 };
const grade = { studentId: student.id, subjectId: 'prog1', materialId: task.id, title: task.title, section: 'Rizal', quarter: 1, teacherSaved: true, status: 'Incomplete', score: 70 };
const upload = { studentId: student.id, subjectId: 'prog1', materialId: task.id, title: task.title, section: 'Rizal', quarter: 1, status: 'Submitted', submittedAt: '2026-10-07T12:00:00Z', files: [{ name: 'actual-submission.docx', url: 'data:fixture' }] };
let submissions = { [student.id]: { 'prog1_sec_rizal_mat_task-one': grade } };
const resets = [];
const window = {
    getSharedAssessmentSubmissionsStorage: () => submissions,
    getUnifiedSubjectAliases: () => ['prog1', 'card-prog1'],
    getStudentFullAliases: target => [target.id],
    isSubmissionMatchForStudent: (row, target) => row.studentId === target.id,
    submissionSectionsMatch: (a, b) => a === b,
    _getTeacherGradebookCached: () => ({ scores: {}, statuses: {} }),
    getCategoryDetails: () => [task], resolveAssessmentHPS: () => ({ points: 100 }),
    resolveGradebookScoreColumn: () => ({ category: 'assignment', itemIdx: 0, item: task }),
    readScorePanelPoints: () => 70,
    _studentAssessmentDetailsCache: new Map(), _studentAssessmentDetailsCacheTime: Date.now(),
    syncSharedScoreAndStatus: params => resets.push(params),
    getUnifiedSectionStudents: () => [student], showToast() {}
};
const context = vm.createContext({ window, localStorage: storage, sessionStorage: storage, console });
function load(name) {
    const start = source.indexOf(`window.${name} = function`);
    assert.ok(start >= 0, name);
    vm.runInContext(source.slice(start, source.indexOf('\n};', start) + 4), context);
}
['getAssessmentMatchIdentity', 'submissionMatchesAssessment', 'studentHasTurnedInWork', 'findAssessmentSubmittedWork',
    'getStudentAssessmentSubmission', 'getEffectiveAssessmentStatusAndScore', 'getGradebookStudentItemScore', 'resolveStudentAssessmentSubmissionDetails'].forEach(load);
assert.equal(window.findAssessmentSubmittedWork(student, task, 'prog1', 'Rizal', 1), null);
let details = window.resolveStudentAssessmentSubmissionDetails(task, 'prog1', 0, 0, 'Rizal', student);
assert.equal(details.numericScore, null); assert.equal(details.turnedIn, false);
assert.equal(details.statusName, 'Not Submitted');
assert.equal(resets.length, 0, 'A missing upload lookup must never erase a persisted teacher grade');
const readSubmission = window.getStudentAssessmentSubmission;
window.getStudentAssessmentSubmission = () => grade;
window._studentAssessmentDetailsCache.clear();
const resetCount = resets.length;
assert.doesNotThrow(() => window.resolveStudentAssessmentSubmissionDetails(task, 'prog1', 0, 0, 'Rizal'));
assert.equal(resets.length, resetCount, 'Teacher overview without a student must never reset a grade');
window.getStudentAssessmentSubmission = readSubmission;
window._studentAssessmentDetailsCache.clear();
assert.equal(window.getGradebookStudentItemScore(student, 'assignment', 0, task, 'prog1', 1), null);
submissions[student.id].actual_upload = upload;
window._studentAssessmentDetailsCache.clear();
const merged = window.getStudentAssessmentSubmission('prog1', 'assessments', 0, 0, task, student);
assert.equal(merged.files[0].name, 'actual-submission.docx');
assert.equal(merged.score, 70); assert.equal(merged.status, 'Incomplete');
assert.equal(grade.files, undefined, 'Stored grade metadata is not mutated while merging');
details = window.resolveStudentAssessmentSubmissionDetails(task, 'prog1', 0, 0, 'Rizal', student);
assert.equal(details.turnedIn, true); assert.equal(details.numericScore, 70);
assert.equal(window.findAssessmentSubmittedWork(student, task, 'prog1', 'Other', 1), null);
assert.equal(window.findAssessmentSubmittedWork(student, task, 'prog1', 'Rizal', 2), null);
assert.equal(window.findAssessmentSubmittedWork({ ...student, id: 'other' }, task, 'prog1', 'Rizal', 1), null);
assert.equal(window.findAssessmentSubmittedWork(student, { ...task, id: 'another-task', title: 'Another task' }, 'prog1', 'Rizal', 1), null);
assert.equal(window.findAssessmentSubmittedWork(student, { ...task, id: 'another-task' }, 'prog1', 'Rizal', 1), null, 'Identical titles cannot borrow another assessment upload');
const quiz = { ...task, id: 'quiz-one', quizId: 'QZ-one', category: 'quiz', title: 'Quiz One' };
const quizGrade = { ...grade, materialId: quiz.id, quizId: quiz.quizId, title: quiz.title };
submissions[student.id].quiz_grade = quizGrade;
assert.equal(window.findAssessmentSubmittedWork(student, quiz, 'prog1', 'Rizal', 1), null);
submissions[student.id].quiz_answers = { ...quizGrade, teacherSaved: false, submittedAt: '2026-10-07T12:00:00Z', answers: { 0: 'answer' }, status: 'Pending' };
assert.ok(window.findAssessmentSubmittedWork(student, quiz, 'prog1', 'Rizal', 1));
assert.ok(window.getStudentAssessmentSubmission('prog1', 'quiz', 0, 0, quiz, student).answers);
delete submissions[student.id].actual_upload;
load('syncSharedScoreAndStatus');
const before = JSON.stringify(submissions);
assert.equal(window.syncSharedScoreAndStatus({ studentId: student.id, studentName: student.name, subjectId: 'prog1', section: 'Rizal', quarter: 1, item: task, category: 'assignment', itemIdx: 0, score: 80, status: 'none' }), null);
assert.equal(JSON.stringify(submissions), before, 'Blocked grade writes must not mutate stored data');
assert.equal(values.size, 0);
assert.equal(window.syncSharedScoreAndStatus({ studentId: student.id, studentName: student.name, subjectId: 'prog1', section: 'Rizal', quarter: 1, item: task, category: 'assignment', itemIdx: 0, score: 0, status: 'none' }), null, 'Zero is still a score and requires submission');
load('commitGradebookScoreInput');
const input = { value: '90', disabled: false, dataset: { studentId: student.id, studentName: student.name, itemId: task.id, taskTitle: task.title, subject: 'prog1', section: 'Rizal', quarter: '1' }, closest: () => ({ dataset: {} }) };
window.commitGradebookScoreInput(input, null, true);
assert.equal(input.value, ''); assert.equal(input.disabled, true);
console.log('Missing-upload recovery, saved-grade preservation, scoped matching, and no-submission write protection passed');
