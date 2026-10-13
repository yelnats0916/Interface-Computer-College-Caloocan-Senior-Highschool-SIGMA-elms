const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/shared-components.js'), 'utf8');
const tasks = [
    { id: 'task1', title: 'Task 1 - Practice', category: 'assignment', itemIdx: 0, topicItemIdx: 0, max: 100 },
    { id: 'task2', title: 'Task 2 - Basic Syntax and Data Types Quiz', category: 'assignment', itemIdx: 1, topicItemIdx: 0, max: 100 }
];
const scores = { prog1: { 1: { 'sec:rizal': { juan: { assignment: { 0: 90, 1: 72 } } } } } };
function reload(withResolver) {
    const window = {
        getCategoryDetails: () => tasks,
        assessmentClosureKey: () => '',
        _getTeacherGradebookCached: () => ({ scores, statuses: {} })
    };
    const context = { window, localStorage: { getItem: () => null } };
    if (withResolver) {
        vm.runInNewContext(source.slice(source.indexOf('window.resolveGradebookScoreColumn = function'),
            source.indexOf('window.applyOfficialQuizScore = function')), context);
    }
    vm.runInNewContext(source.slice(source.indexOf('window.getEffectiveAssessmentStatusAndScore = function'),
        source.indexOf('window.getStudentFullAliases = function')), context);
    return window;
}
for (const withResolver of [false, true]) {
    const api = reload(withResolver);
    const student = { id: 'juan', section: 'Rizal' };
    const read = task => api.getEffectiveAssessmentStatusAndScore(student, 'assignment', task.itemIdx, 'prog1', 1, task).score;
    assert.equal(Number(read(tasks[0])), 90);
    assert.equal(Number(read(tasks[1])), 72);
    scores.prog1[1]['sec:rizal'].juan.assignment[1] = 0;
    assert.equal(Number(read(tasks[1])), 0, 'Zero must not fall back to Task 1');
    delete scores.prog1[1]['sec:rizal'].juan.assignment[1];
    assert.equal(read(tasks[1]), '', 'An unscored Task 2 must not borrow Task 1');
    scores.prog1[1]['sec:rizal'].juan.assignment[1] = 72;
}
assert.ok(source.includes('return finalList;'), 'Shared assessment identities must retain source order');
assert.ok(!source.includes('return window.orderAssessmentsOldestFirst(finalList);'));
const pt = { id: 'pt-new', title: 'PT - Practice', category: 'assignment', type: 'task', itemIdx: 0, max: 80 };
const api = reload(true);
api.getCategoryDetails = category => category === 'perf. task' ? [pt] : tasks;
assert.equal(api.resolveGradebookScoreColumn('prog1', 'Rizal', 1, pt, 0, 0).category, 'perf. task');
const student = { id: 'juan', section: 'Rizal' };
assert.equal(api.getEffectiveAssessmentStatusAndScore(student, 'perf. task', 0, 'prog1', 1, pt).score, '',
    'Unsubmitted PT must not borrow assignment slot zero');
scores.prog1[1]['sec:rizal'].juan['perf. task'] = { 0: 63 };
assert.equal(Number(api.getEffectiveAssessmentStatusAndScore(student, 'perf. task', 0, 'prog1', 1, pt).score), 63);
assert.equal(Number(api.getEffectiveAssessmentStatusAndScore(student, 'assignment', 0, 'prog1', 1, tasks[0]).score), 90);
console.log('PASS: Task 1 and Task 2 retain independent scores, including zero, across reloads.');
