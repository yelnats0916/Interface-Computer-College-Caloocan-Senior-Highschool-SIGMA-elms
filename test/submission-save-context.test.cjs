const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/shared-components.js'), 'utf8');
const start = source.indexOf('window.saveTeacherGradingScore = function');
const input = { value: '80', max: '100', style: {}, disabled: false };
const button = { dataset: { studentId: '2222222', studentName: 'Dela Cruz, Juan Abad' } };
const student = { id: '2222222', name: button.dataset.studentName };
const assessment = { id: 'task-one', title: 'Task 1', category: 'assignment', quarter: 1 };
const upload = { studentId: student.id, materialId: assessment.id, files: [{ name: 'submitted.docx' }] };
let saved;
let submitted = true;
const window = {
    currentTopicState: { subjectId: 'Programming', selectedSection: 'Rizal', selectedStudent: student.name, topicIdx: 0, assessmentIdx: 0, activeTab: 'assessments' },
    _latestSubmissionForScorePanel: { subjectId: 'Programming', section: 'Rizal', studentId: student.id, topicIdx: 0, activeIdx: 0, assessment, subData: upload },
    getCurrentTopicAssessment: () => null,
    getUnifiedSectionStudents: () => [student],
    findAssessmentSubmittedWork: (who, item, subject, section, quarter, known) => submitted && item === assessment && known[0] === upload ? upload : null,
    syncSharedScoreAndStatus: value => { saved = value; },
    showToast() {}
};
const nodes = { 'teacher-grading-score-input': input, 'teacher-grading-save-btn': button, 'teacher-grading-status-select': { value: 'Incomplete' } };
vm.runInNewContext(source.slice(start, source.indexOf('\n};', start) + 4), { window, document: { getElementById: id => nodes[id] }, console });
window.saveTeacherGradingScore();
assert.equal(saved.score, 80);
assert.equal(saved.item.id, assessment.id);
assert.equal(saved.status, 'incomplete');
submitted = false;
saved = null;
input.value = '75';
window.saveTeacherGradingScore();
assert.equal(saved, null, 'Unsubmitted work is not scored');
assert.equal(input.value, '75', 'Blocked save preserves the draft');
assert.equal(input.disabled, false, 'Blocked save does not lock the draft');
console.log('PASS: save uses displayed submission identity and blocked saves preserve the entered score');
