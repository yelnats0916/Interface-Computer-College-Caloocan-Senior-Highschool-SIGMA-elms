const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/shared-components.js'), 'utf8');
const data = new Map();
const localStorage = { getItem: k => data.get(k) || null, setItem: (k, v) => data.set(k, v) };
function reload() {
    const context = { window: {}, localStorage };
    for (const [start, end] of [
        ['window.saveGradebookAttendance = function', 'window.readScorePanelPoints = function'],
        ['window.gradebookAttendanceMark = function', 'window.gradebookAttendanceCellStyle = function']
    ]) vm.runInNewContext(source.slice(source.indexOf(start), source.indexOf(end)), context);
    return context.window;
}
const student = { id: '2222222', section: 'Rizal' };
const scope = { subjectId: 'prog1', section: 'Rizal', quarter: 1 };
const tasks = [
    { id: 'task1', category: 'assignment', title: 'Task 1 - Practice', topicItemIdx: 0 },
    { id: 'task2', category: 'assignment', title: 'Task 2 - Basic Syntax and Data Types Quiz', topicItemIdx: 1 },
    { id: 'quiz1', category: 'quiz', title: 'Quiz 1 - Basic Syntax and Data Types', topicItemIdx: 1 }
];
let api = reload();
api.saveGradebookAttendance(student, 'excuse', tasks[0], 0, 0, scope);
api.saveGradebookAttendance(student, 'absent', tasks[1], 0, 1, scope);
for (const status of ['incomplete', 'missing', 'absent']) {
    api.saveGradebookAttendance(student, status, tasks[2], 0, 1, scope);
    api = reload();
    const tones = tasks.map(item => api.gradebookAttendanceMark(student, item, item.category, item.topicItemIdx, 'prog1', 1)?.tone);
    assert.deepEqual(tones, ['excuse', 'absent', status]);
}
api.saveGradebookAttendance(student, 'none', tasks[2], 0, 1, scope);
api = reload();
assert.equal(api.gradebookAttendanceMark(student, tasks[1], 'assignment', 1, 'prog1', 1)?.tone, 'absent');
assert.equal(api.gradebookAttendanceMark(student, tasks[2], 'quiz', 1, 'prog1', 1), null);
console.log('PASS: independent attendance survives reload, status changes and clearing.');
