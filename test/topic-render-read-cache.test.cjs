const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/shared-components.js'), 'utf8');
const start = source.indexOf('window.withGradebookReadCache = function');
const end = source.indexOf('\nwindow.calculateGradebookCategoryPercentage', start);
let calls = 0;
let score = 50;
const reader = (_student, item) => { calls++; return item.id === 'quiz' ? score : 90; };
const window = { readScorePanelPoints: reader };
let gradeReads = 0;
window.getGradebookStudentItemScore = () => { gradeReads++; return score; };
vm.runInNewContext(source.slice(start, end), { window });
const student = { id: '2222222' };
const quiz = { id: 'quiz' };
const task = { id: 'task' };
window.withGradebookReadCache(() => {
    for (let i = 0; i < 500; i++) assert.equal(window.readScorePanelPoints(student, quiz, 'prog1'), 50);
    assert.equal(window.readScorePanelPoints(student, task, 'prog1'), 90);
});
assert.equal(calls, 2);
assert.equal(window.readScorePanelPoints, reader);
score = 75;
window.withGradebookReadCache(() => assert.equal(window.readScorePanelPoints(student, quiz, 'prog1'), 75));
window.withGradebookReadCache(() => {
    for (let i = 0; i < 100; i++) window.getGradebookStudentItemScore(student, 'quiz', 0, quiz, 'prog1', 1);
});
assert.equal(gradeReads, 1, 'Repeated category and detail score reads share one lookup');
assert.equal(calls, 3);
assert.throws(() => window.withGradebookReadCache(() => { throw Error('render failed'); }));
assert.equal(window._gradebookReadCacheActive, false);
assert.equal(window.readScorePanelPoints, reader);
for (const file of ['student.js', 'teacher.js']) {
    const page = fs.readFileSync(path.join(__dirname, '../js', file), 'utf8');
    assert.match(page, /function _renderTopicContentMain[^]*?withGradebookReadCache\(/);
}
const teacherSource = fs.readFileSync(path.join(__dirname, '../js/teacher.js'), 'utf8');
const initStart = teacherSource.indexOf('    function initializeSectionFeatures(navId)');
const gradesStart = teacherSource.indexOf("        if (navId === 'nav-grades')", initStart);
const gradesEnd = teacherSource.indexOf('            return;', gradesStart);
assert.ok(gradesStart > initStart);
assert.doesNotMatch(teacherSource.slice(gradesStart, gradesEnd), /renderTeacherGradesView|renderSigmaGradesView/);
console.log('PASS: 500 repeated panel reads use one lookup; assessments stay separate and next render sees edits.');
