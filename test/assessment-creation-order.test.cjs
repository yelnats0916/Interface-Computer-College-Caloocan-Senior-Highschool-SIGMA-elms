const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/shared-components.js'), 'utf8');
const start = source.indexOf('window.orderAssessmentsOldestFirst = function');
const end = source.indexOf('window.getUnifiedTopicAssessments = function', start);
const window = {};
vm.runInNewContext(source.slice(start, end), { window });
const items = [
    { id: 'task1', createdAt: '2026-09-23', itemIdx: 0 },
    { id: 'pt-new', createdAt: '2026-10-13', itemIdx: 0 },
    { id: 'quiz1', createdAt: '2026-09-24', itemIdx: 1 }
];
const result = window.orderAssessmentsOldestFirst(items);
assert.deepEqual(Array.from(result, item => item.id), ['task1', 'quiz1', 'pt-new']);
assert.equal(result[2], items[1], 'Assessment references and identities must stay intact');
assert.equal(result[2].itemIdx, 0);
assert.equal(items[1].id, 'pt-new', 'Source list is not reordered');
const teacherSource = fs.readFileSync(require('node:path').join(__dirname, '../js/teacher.js'), 'utf8');
for (const group of ['group', 'grp']) {
    assert.ok(teacherSource.includes(`window.orderAssessmentsOldestFirst(${group}.assessments)`),
        `Teacher release renderer must order ${group}.assessments`);
}
const released = window.orderAssessmentsOldestFirst([
    { id: 'task1', rawItem: { createdAt: '2026-09-23' } },
    { id: 'pt-new', rawItem: { createdAt: '2026-10-13' } },
    { id: 'quiz1', rawItem: { createdAt: '2026-09-24' } }
]);
assert.deepEqual(Array.from(released, item => item.id), ['task1', 'quiz1', 'pt-new']);
console.log('PASS: new assessment follows older quiz/task entries without changing IDs or source data.');
