const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/shared-components.js'), 'utf8');
const start = source.indexOf('        let currentItem = null;', source.indexOf('window.buildTopicSectionSelectorCard ='));
const end = source.indexOf('        const assCat =', start);
const assessment = { id: 'task-one', title: 'Variable Declaration Practice', category: 'assignment' };
const displayed = { subjectId: 'Programming', topicIdx: 0, activeIdx: 0, section: 'Rizal', studentId: 'student-one', assessment };
const window = {
    _latestSubmissionForScorePanel: displayed,
    getCurrentTopicAssessment: () => null,
    isSubmissionMatchForStudent: (row, student) => row.studentId === student.id
};
const context = vm.createContext({ window, subjectId: 'Programming', tab: 'assessments', actIdx: 0, topicIdx: 0,
    section: 'Rizal', activeStudentObj: { id: 'student-one' }, data: {} });
vm.runInContext(`window.resolvePanelItem = function () { ${source.slice(start, end)} return currentItem; };`, context);
assert.equal(window.resolvePanelItem(), assessment, 'Panel uses the assessment whose submitted file is displayed');
context.activeStudentObj = { id: 'student-two' };
assert.equal(window.resolvePanelItem(), null, 'Changing student cannot reuse displayed assessment context');
context.activeStudentObj = { id: 'student-one' };
context.actIdx = 1;
assert.equal(window.resolvePanelItem(), null, 'Changing task cannot reuse displayed assessment context');
context.actIdx = 0;
context.section = 'Newton';
assert.equal(window.resolvePanelItem(), null, 'Changing section cannot reuse displayed assessment context');
context.section = 'Rizal';
context.subjectId = 'Mathematics';
assert.equal(window.resolvePanelItem(), null, 'Changing subject cannot reuse displayed assessment context');
assert.ok(source.includes('window._latestSubmissionForScorePanel.assessment = { ...ass,'), 'File view publishes its exact assessment');
window._latestSubmissionForScorePanel = null;
context.data = { currentAssessment: assessment };
assert.equal(window.resolvePanelItem(), assessment, 'Fresh-load teacher panel gets the displayed task without any in-memory submission context');
console.log('PASS: score panel retains displayed assessment identity without borrowing another student/task/section/subject context');
