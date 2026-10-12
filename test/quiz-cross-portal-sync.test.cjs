const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const shared = fs.readFileSync(path.join(__dirname, '../js/shared-components.js'), 'utf8');
const analytics = fs.readFileSync(path.join(__dirname, '../js/sigma-analytics.js'), 'utf8');
const store = new Map();
const storage = { getItem: k => store.get(k) || null, key: i => [...store.keys()][i], get length() { return store.size; } };
const student = { id: '2222222', name: 'Dela Cruz, Juan Abad', section: 'Rizal' };
const subject = { id: 'prog1', name: 'Computer Programming 1' };
store.set('sigma-admin-subjects', JSON.stringify([subject]));
const quiz = { id: 'assessment-quiz', quizId: 'QZ-9301', title: 'Quiz 1 - Basic Syntax and Data Types', category: 'quiz', topicIdx: 0, topicItemIdx: 2, itemIdx: 0, max: 55, quarter: 1, section: 'Rizal' };
const attempt = { studentId: student.id, subjectId: 'card-prog1', section: 'Grade 11 - Rizal', quarter: 'q1', materialId: quiz.id, quizId: quiz.quizId, title: quiz.title, status: 'Pending', isPending: true, submittedAt: '2026-10-05T00:38:00', score: 20, teacherSaved: true, answers: { 0: 'answer' }, questions: [{ points: 55 }] };
let submissions = { [student.id]: { prog1_quiz: attempt } };
const window = {
    currentTopicState: { subjectId: 'math', selectedSection: 'Newton' },
    sigmaGradesState: { selectedSubjectSection: { subject: subject.name, sectionName: 'Rizal' }, activeQuarter: 1 },
    getTopicSubject: id => ['card-prog1', 'prog1', subject.name].includes(id) ? subject : null,
    getAllSubjectsRaw: () => [subject],
    getSharedAssessmentSubmissionsStorage: () => submissions,
    isSubmissionMatchForStudent: (sub, target) => sub.studentId === target.id,
    submissionSectionKey: s => String(s || '').replace(/^grade\s*\d+\s*-?\s*/i, '').trim().toLowerCase(),
    submissionSectionsMatch: (a, b) => window.submissionSectionKey(a) === window.submissionSectionKey(b),
    _getTeacherGradebookCached: () => ({ scores: {}, statuses: {} }),
    getCategoryDetails: () => [quiz],
    resolveAssessmentHPS: () => ({ points: 55 }),
    _studentAssessmentDetailsCache: new Map(), _studentAssessmentDetailsCacheTime: Date.now(),
    resolveGradebookScoreColumn: () => ({ category: 'quiz', itemIdx: 0, item: quiz }),
    readScorePanelPoints: () => null
};
const context = vm.createContext({ window, localStorage: storage, sessionStorage: storage, console });
const load = name => {
    const start = shared.indexOf(`window.${name} = function`);
    assert.ok(start >= 0, name);
    vm.runInContext(shared.slice(start, shared.indexOf('\n};', start) + 4), context);
};
['readAssessmentSubmissionEarnedPoints', 'getUnifiedSubjectKeyVariants', 'getUnifiedSubjectAliases', 'getAssessmentMatchIdentity', 'submissionMatchesAssessment', 'getAssessmentGradeStorageKeys', 'getStudentAssessmentSubmission', 'studentHasTurnedInWork', 'studentHasAssessmentSubmission', 'getEffectiveAssessmentStatusAndScore', 'resolveStudentAssessmentSubmissionDetails'].forEach(load);
const readerStart = analytics.indexOf('    function getAdminGradebookStudentItemScore(');
load('getGradebookStudentItemScore');
const readerEnd = analytics.indexOf('    window.getAdminGradebookAssessmentItems', readerStart);
vm.runInContext(analytics.slice(readerStart, readerEnd), context);
for (const id of ['card-prog1', 'Computer-Programming-1', subject.name]) {
    assert.ok(window.getUnifiedSubjectAliases(id).includes('prog1'), `Canonical subject alias: ${id}`);
    assert.equal(window.getStudentAssessmentSubmission(id, 'assessments', 2, 0, quiz, student)?.score, 20, `${id}: submitted answers found`);
    const details = window.resolveStudentAssessmentSubmissionDetails(quiz, id, 0, 2, 'Rizal', student);
    assert.equal(details.numericScore, 20, `${id}: panel score`);
    assert.equal(details.turnedIn, true, `${id}: panel unlocked`);
    assert.ok(details.sub.answers, `${id}: review answers available`);
    assert.equal(window.getAdminGradebookStudentItemScore(student, 'quiz', 0, quiz, id, 1), 20, `${id}: gradebook score despite pending attempt`);
}
assert.equal(window.getStudentAssessmentSubmission('Computer-Programming-1', 'quiz', 2, 0, { ...quiz, quarter: 2 }, student), null, 'Other quarter excluded');
assert.equal(window.getStudentAssessmentSubmission('Computer-Programming-1', 'quiz', 2, 0, { ...quiz, section: 'Newton' }, student), null, 'Other section excluded');
assert.equal(window.getStudentAssessmentSubmission('math', 'quiz', 2, 0, quiz, student), null, 'Other subject excluded');
assert.equal(window.getStudentAssessmentSubmission('prog1', 'quiz', 2, 0, quiz, { id: 'other-student' }), null, 'Other student excluded');
delete window.getAllSubjectsRaw;
store.delete('sigma-admin-subjects');
window.getTopicSubject = id => ({ id, name: subject.name });
assert.equal(window.getStudentAssessmentSubmission('Computer-Programming-1', 'quiz', 2, 0, quiz, student)?.score, 20, 'Admin without teacher subject helpers reads stored subject aliases');
attempt.attendance = 'incomplete';
window._studentAssessmentDetailsCache.clear();
assert.equal(window.resolveStudentAssessmentSubmissionDetails(quiz, 'Computer-Programming-1', 0, 2, 'Rizal', student).attendanceTone, 'incomplete', 'Admin status follows teacher quiz record');
assert.notEqual(window.getEffectiveAssessmentStatusAndScore(student, 'quiz', 0, 'prog1', 2, { ...quiz, quarter: 2 }).status, 'incomplete', 'Status does not leak across quarters');
delete attempt.attendance;
attempt.teacherSaved = false;
window._studentAssessmentDetailsCache.clear();
for (const id of ['card-prog1', 'Computer-Programming-1', subject.name]) {
    assert.equal(window.getAdminGradebookStudentItemScore(student, 'quiz', 0, quiz, id, 1), 20, `${id}: pending quiz earned points match score panel without teacher override`);
    assert.equal(window.getEffectiveAssessmentStatusAndScore(student, 'quiz', 0, id, 1, quiz).isPending, true, 'Showing earned points does not finalize pending review');
}
attempt.score = 0;
assert.equal(window.getAdminGradebookStudentItemScore(student, 'quiz', 0, quiz, 'prog1', 1), 0, 'Earned zero is displayed, not blank');
delete attempt.score;
attempt.autoScore = 20;
assert.equal(window.getAdminGradebookStudentItemScore(student, 'quiz', 0, quiz, 'prog1', 1), 20, 'Auto-scored points are readable before final review');
attempt.score = 20;
delete attempt.autoScore;
delete attempt.score;
attempt.userScore = 20;
assert.equal(window.getGradebookStudentItemScore(student, 'quiz', 0, quiz, 'Computer Programming 1', 1), 20, 'Quiz userScore matches the score panel');
delete attempt.userScore;
attempt.attempts = [{ submittedAt: attempt.submittedAt, score: 20 }];
assert.equal(window.getGradebookStudentItemScore(student, 'quiz', 0, quiz, 'Computer Programming 1', 1), 20, 'Latest attempt score matches the score panel');
delete attempt.attempts;
attempt.score = 20;
assert.equal(window.studentHasAssessmentSubmission(student, { ...quiz, rawItem: { ...quiz, section: 'Newton' } }, 'prog1', 'quiz'), true, 'Gradebook wrapper section wins over stale raw item section');
submissions = {};
assert.equal(window.getAdminGradebookStudentItemScore(student, 'quiz', 0, quiz, 'prog1', 1), null, 'Unsubmitted quiz has no borrowed score');
console.log('PASS: teacher/admin subject routes share quiz answers, editable panel and gradebook scores; pending teacher grades and section/quarter/student isolation preserved.');
