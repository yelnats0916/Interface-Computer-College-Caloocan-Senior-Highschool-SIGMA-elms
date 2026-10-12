const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/shared-components.js'), 'utf8');
const student = { id: '2222222', name: 'Dela Cruz, Juan Abad' };
const task = { id: 'task-one', title: 'Task 1 - Variable Declaration Practice', category: 'assignment', quarter: 1,
    section: 'Rizal', topicIdx: 0, topicItemIdx: 0, max: 100 };
const base = { studentId: student.id, subjectId: 'prog1', materialId: task.id, title: task.title, section: 'Rizal', quarter: 1 };
const grade = { ...base, teacherSaved: true, status: 'Incomplete', score: 70 };
const upload = { ...base, status: 'Submitted', submittedAt: '2026-10-03T02:25:00Z', files: [{ name: 'E02_01TP.docx', url: 'data:fixture' }] };
const submissions = { [student.id]: { prog1_sec_rizal_mat_task_one: upload, prog1_sec_rizal_mat_placeholder: grade,
    'prog1_sec_rizal_mat_task-one': grade } };
const values = new Map();
const storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value),
    key: index => [...values.keys()][index], get length() { return values.size; } };
const window = {
    currentTopicState: { subjectId: 'card-prog1', selectedSection: 'Rizal', selectedStudent: 'Juan Abad Dela Cruz' },
    getStoredJson: (key, fallback) => key === 'sigma-admin-sections'
        ? [{ name: 'Rizal', subject: 'Computer Programming 1', students: [student] }] : fallback,
    getTopicSubject: () => ({ id: 'prog1', name: 'Computer Programming 1' }),
    formatStudentLastFirstMiddle: user => user.name,
    getSharedAssessmentSubmissionsStorage: () => submissions,
    _getTeacherGradebookCached: () => ({ scores: {}, statuses: {} }),
    getCategoryDetails: () => [task], resolveAssessmentHPS: () => ({ points: 100 }),
    resolveGradebookScoreColumn: () => ({ category: 'assignment', itemIdx: 0, item: task }),
    readScorePanelPoints: () => null, getLoggedInStudentUser: () => ({ ...student, section: 'Rizal' }),
    _studentAssessmentDetailsCache: new Map(), _studentAssessmentDetailsCacheTime: Date.now(),
    syncSharedScoreAndStatus: () => { throw new Error('Rendering a submitted file must not reset its grade'); }
};
const context = vm.createContext({ window, localStorage: storage, sessionStorage: storage, console });
function load(name) {
    const start = source.indexOf(`window.${name} = function`);
    assert.ok(start >= 0, name);
    vm.runInContext(source.slice(start, source.indexOf('\n};', start) + 4), context);
}
['resolveRosterStudent', 'getUnifiedSubjectAliases', 'getUnifiedSectionStudents', 'getStudentFullAliases',
    'isSubmissionMatchForStudent', 'getAssessmentMatchIdentity', 'submissionMatchesAssessment', 'studentHasTurnedInWork',
    'findAssessmentSubmittedWork', 'getStudentAssessmentSubmission', 'getEffectiveAssessmentStatusAndScore',
    'resolveStudentAssessmentSubmissionDetails'].forEach(load);
const start = source.indexOf('        // Student submission state', source.indexOf('window.renderSharedAssessmentsTabHtml'));
const end = source.indexOf('\n        // A quiz only has a submission', start);
vm.runInContext(`window.renderSubmissionFixture = function (role, selectedStudent) {
    const options = { selectedStudent }, subjectId = 'card-prog1', tab = 'assessments', activeIdx = 0,
        topicIdx = 0, targetSection = 'Rizal', ass = ${JSON.stringify(task)}, isAnyQuiz = false, isViewSubmissionMode = true;
    ${source.slice(start, end)}
    return subData;
};`, context);
const teacher = window.renderSubmissionFixture('teacher', 'Juan Abad Dela Cruz');
const studentView = window.renderSubmissionFixture('student', '');
window.getTopicSubject = id => ({ id: id === 'SEC-R3100E' ? id : 'prog1', name: 'Computer Programming 1' });
window.getAllSubjectsRaw = () => [{ id: 'prog1', name: 'Computer Programming 1' }, { id: 'math', name: 'Mathematics' }];
assert.ok(window.getUnifiedSubjectAliases('SEC-R3100E').includes('prog1'), 'Classroom route resolves the canonical subject ID through its exact name');
const classroomSubmission = window.getStudentAssessmentSubmission('SEC-R3100E', 'assessments', 0, 0, task, student);
assert.equal(classroomSubmission.files[0].name, 'E02_01TP.docx', 'Student classroom route retains the submitted upload');
assert.equal(classroomSubmission.score, 70, 'Student classroom route retains the saved grade');
assert.ok(!window.getUnifiedSubjectAliases('SEC-R3100E').includes('math'), 'Unrelated subjects remain isolated');
delete window.getAllSubjectsRaw;
const previousStoredJson = window.getStoredJson;
window.getStoredJson = (key, fallback) => key === 'sigma-admin-subjects'
    ? [{ id: 'prog1', name: 'Computer Programming 1' }, { id: 'math', name: 'Mathematics' }]
    : previousStoredJson(key, fallback);
assert.ok(window.getUnifiedSubjectAliases('SEC-R3100E').includes('prog1'), 'Student portal resolves subject without the teacher-only catalog helper');
const studentOnlySubmission = window.getStudentAssessmentSubmission('SEC-R3100E', 'assessments', 0, 0, task, student);
assert.equal(studentOnlySubmission.files[0].name, 'E02_01TP.docx', 'Actual student-only lookup finds the teacher-visible file');
assert.equal(window.getStudentAssessmentSubmission('SEC-R3100E', 'assessments', 0, 0, task, { id: 'other-student' }), null,
    'Student-only recovery cannot display another student upload');
assert.equal(teacher.files[0].name, 'E02_01TP.docx');
assert.equal(teacher.score, 70);
assert.equal(teacher.status, 'Incomplete');
assert.equal(teacher.files[0].name, studentView.files[0].name);
assert.equal(teacher.score, studentView.score);
assert.equal(window._latestSubmissionForScorePanel.studentId, student.id);
values.set('sigma_sub_prog1_top_0_assessments_0', JSON.stringify(upload));
assert.equal(window.renderSubmissionFixture('teacher', 'Unknown Student'), null, 'Unmatched names cannot borrow another student submission');
values.clear();
assert.equal(values.size, 0, 'Recovery reads existing records without rewriting them');
load('getGradebookStudentItemScore');
submissions[student.id] = {};
window.getEffectiveAssessmentStatusAndScore = () => ({ score: 80, teacherSaved: true });
for (const prefix of ['sigma_sub_', 'sigma_submission_']) {
    values.set(`${prefix}prog1_top_0_assessments_0`, JSON.stringify(upload));
    assert.equal(window.getGradebookStudentItemScore(student, 'assignment', 0, task, 'prog1', 1), 80,
        'Legacy upload with explicit student identity unlocks the same saved grade');
    assert.equal(window.findAssessmentSubmittedWork({ id: '26010314' }, task, 'prog1', 'Rizal', 1), null,
        'Legacy upload cannot unlock a different student');
    assert.equal(window.findAssessmentSubmittedWork(student, task, 'prog1', 'Rizal', 2), null,
        'Legacy upload cannot unlock a different quarter');
    assert.equal(window.findAssessmentSubmittedWork(student, task, 'prog1', 'Newton', 1), null,
        'Legacy upload cannot unlock a different section');
    assert.equal(window.findAssessmentSubmittedWork(student, { ...task, id: 'task-two' }, 'prog1', 'Rizal', 1), null,
        'Legacy upload cannot unlock another assessment');
    values.set(`${prefix}prog1_top_0_assessments_0`, JSON.stringify({ ...upload, studentId: undefined }));
    assert.equal(window.findAssessmentSubmittedWork(student, task, 'prog1', 'Rizal', 1), null,
        'Unowned generic upload stays locked');
    values.clear();
}
window._sharedAssessmentSubmissionsMemoryCache = { sigma_submission_prog1_top_0_assessments_0: upload };
assert.equal(window.getGradebookStudentItemScore(student, 'assignment', 0, task, 'prog1', 1), 80,
    'Memory-backed upload unlocks the same saved grade');
delete window._sharedAssessmentSubmissionsMemoryCache;
context.sessionStorage = { length: 1, key: () => 'sigma_sub_prog1_top_0_assessments_0', getItem: () => JSON.stringify(upload) };
assert.equal(window.getGradebookStudentItemScore(student, 'assignment', 0, task, 'prog1', 1), 80,
    'Session-backed upload unlocks the same saved grade');
context.sessionStorage = storage;
values.set('sigma_sub_prog1_top_0_assessments_0', JSON.stringify({ ...base, history: [upload] }));
assert.ok(window.findAssessmentSubmittedWork(student, task, 'prog1', 'Rizal', 1), 'Upload retained in history is recognized');
values.clear();
submissions[student.id] = { actual_upload: upload, 'prog1_sec_rizal_mat_task-one': { ...grade, score: 90 } };
window.getEffectiveAssessmentStatusAndScore = () => ({ score: '' });
const recordsBeforeRead = JSON.stringify(submissions);
assert.equal(window.getGradebookStudentItemScore(student, 'assignment', 0, { ...task, subjectId: 'prog1' }, 'Computer Programming 1', 1), 90,
    'Reloaded gradebook recovers persisted teacher score when the column lookup is blank');
assert.equal(JSON.stringify(submissions), recordsBeforeRead, 'Gradebook lookup does not duplicate or mutate saved records');
submissions[student.id]['prog1_sec_rizal_mat_task-one'].score = 0;
assert.equal(window.getGradebookStudentItemScore(student, 'assignment', 0, task, 'prog1', 1), 0,
    'Persisted zero is retained rather than treated as ungraded');
console.log('PASS: teacher and student recover the same uploaded DOCX, 70 score, and Incomplete status using real student identity.');
const priorGetStoredJson = window.getStoredJson;
window.getStoredJson = (key, fallback) => key === 'sigma-admin-sections'
    ? [{ id: 'SEC-R3100E', name: 'Rizal', subject: 'Computer Programming 1', students: [student] }]
    : priorGetStoredJson(key, fallback);
window.getTopicSubject = id => ['prog1', 'card-prog1', 'Computer Programming 1'].includes(id)
    ? ({ id: 'prog1', name: 'Computer Programming 1' }) : null;
submissions[student.id] = {
    upload: { ...upload, subjectId: 'SEC-R3100E' },
    'prog1_sec_rizal_mat_task-one': { ...grade, score: 90 }
};
assert.ok(window.getUnifiedSubjectAliases('Computer Programming 1').includes('SEC-R3100E'));
const teacherFromName = window.getStudentAssessmentSubmission('Computer Programming 1', 'assessments', 0, 0, task, student);
assert.equal(teacherFromName.files[0].name, 'E02_01TP.docx', 'Teacher subject-name route recovers classroom-ID upload');
assert.equal(teacherFromName.score, 90);
assert.equal(window.findAssessmentSubmittedWork(student, task, 'Mathematics', 'Rizal', 1), null);
submissions[student.id] = {
    'prog1_sec_rizal_mat_task-one': { ...grade, score: 90, files: upload.files }
};
const filesOnlyGrade = window.renderSubmissionFixture('teacher', 'Juan Abad Dela Cruz');
assert.equal(filesOnlyGrade.files[0].name, 'E02_01TP.docx');
const stateStart = source.indexOf('        let isSubmitted = Boolean(subData', source.indexOf('window.renderSharedAssessmentsTabHtml'));
const stateEnd = source.indexOf('\n        let isGraded', stateStart);
vm.runInContext(`window.isDisplayedSubmission = function(subData) {
    ${source.slice(stateStart, stateEnd)}
    return isSubmitted;
};`, context);
assert.equal(window.isDisplayedSubmission(filesOnlyGrade), true, 'Files-array upload stays visible after its status changes to Incomplete');
assert.equal(window.isDisplayedSubmission({ ...grade, score: 90 }), false, 'A grade-only record cannot fabricate submitted work');
assert.equal(window.isDisplayedSubmission({ ...grade, attachments: upload.files }), true);
assert.equal(window.isDisplayedSubmission({ ...grade, attempts: [{ files: upload.files }] }), true);
// Reproduce an admin grade edit when the upload only survives in the fallback cache.
values.clear();
window.getSharedAssessmentSubmissionsStorage = () => JSON.parse(values.get('sigma_student_assessment_submissions') || '{}');
window._sharedAssessmentSubmissionsMemoryCache = { sigma_sub_prog1_top_0_assessments_0: upload };
context.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener: () => {} };
window.refreshAllScorePanelsAndTables = () => {};
load('syncSharedScoreAndStatus');
window.syncSharedScoreAndStatus({ source: 'gradebook_table', studentId: student.id, studentName: student.name,
    subjectId: 'prog1', section: 'Rizal', quarter: 1, category: 'assignment', itemIdx: 0,
    topicIdx: 0, topicItemIdx: 0, item: task, score: 80, status: 'incomplete', maxScore: 100 });
delete window._sharedAssessmentSubmissionsMemoryCache;
const reloadedWork = window.getStudentAssessmentSubmission('Computer Programming 1', 'assessments', 0, 0, task, student);
assert.ok(reloadedWork, 'Submission survives admin save and fallback-cache removal');
assert.equal(reloadedWork.files[0].name, 'E02_01TP.docx');
assert.equal(reloadedWork.score, 80);
assert.equal(reloadedWork.submittedAt, upload.submittedAt);
assert.equal(window.isDisplayedSubmission(reloadedWork), true);
const keysBeforeRepeat = Object.keys(window.getSharedAssessmentSubmissionsStorage()[student.id]).sort();
window.syncSharedScoreAndStatus({ source: 'gradebook_table', studentId: student.id, studentName: student.name,
    subjectId: 'prog1', section: 'Rizal', quarter: 1, category: 'assignment', itemIdx: 0,
    topicIdx: 0, topicItemIdx: 0, item: task, score: 75, status: 'incomplete', maxScore: 100 });
assert.deepEqual(Object.keys(window.getSharedAssessmentSubmissionsStorage()[student.id]).sort(), keysBeforeRepeat,
    'Repeated admin edits do not add submission records');
console.log('PASS: admin save -> cache clear -> teacher reload retains DOCX, timestamp and updated score');
const teacherSource = fs.readFileSync(path.join(__dirname, '../js/teacher.js'), 'utf8');
const routeExpressions = [...teacherSource.matchAll(/const subjectId = (decodeURIComponent\(String\(parts\[1\] \|\| ''\)\)\.replace\(\/_\/g, '-'\));/g)];
assert.equal(routeExpressions.length, 2, 'Startup and history topic routes both decode the subject');
values.clear();
const actualTask = { ...task, id: 'mat-teacher-teacher-1790115175696' };
const actualUpload = { ...upload, id: actualTask.id, materialId: actualTask.id, subjectId: 'card-prog1',
    status: 'Incomplete', fileName: 'E02_01TP.docx', score: 80, teacherSaved: true,
    submittedAt: '2026-10-03T02:25:04.931Z', files: [upload.files[0], { name: 'Gamer Motivations and Game Market Analysis.pdf' }] };
values.set('sigma_sub_2222222_subj_prog1_assessments_0', JSON.stringify(actualUpload));
const hash = '#topic-content:Computer%20Programming%201:0:assessments:0:Rizal:submission';
assert.equal(window.findAssessmentSubmittedWork(student, actualTask, 'Computer%20Programming%201', 'Rizal', 1), null,
    'Reproduce encoded teacher-route mismatch against the real upload identity');
for (const expression of routeExpressions) {
    const decodedSubject = vm.runInNewContext(expression[1], { parts: hash.split(':') });
    assert.equal(decodedSubject, 'Computer Programming 1');
    const reloaded = window.getStudentAssessmentSubmission(decodedSubject, 'assessments', 0, 0, actualTask, student);
    assert.equal(reloaded.fileName, 'E02_01TP.docx');
    assert.equal(reloaded.files.length, 2);
    assert.equal(window.isDisplayedSubmission(reloaded), true);
}
console.log('PASS: actual encoded teacher URL now resolves uploaded DOCX and PDF on startup/history reload');
