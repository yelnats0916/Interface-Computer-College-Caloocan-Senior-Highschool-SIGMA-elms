const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const student = fs.readFileSync(path.join(__dirname, '../js/student.js'), 'utf8');
const assessmentPage = fs.readFileSync(path.join(__dirname, '../js/assessments-page.js'), 'utf8');
const start = student.indexOf('        const assessmentRows = window.AssessmentsPage');
const end = student.indexOf("        aiInsightMessage = 'No AI assessment insight available yet.';", start);
assert.ok(start >= 0 && end > start);
const rows = [
    { activity: 'Task 2', section: 'Rizal', subject: 'Programming', quarter: 'q1', topicIdx: 0, unifiedIdx: 1, startDate: '2026-10-03', score: null, max: 100 },
    { activity: 'Task 1', section: 'Rizal', subject: 'Programming', quarter: 'q1', topicIdx: 0, unifiedIdx: 0, startDate: '2026-10-02', score: 80, max: 100 },
    { activity: 'Other subject', section: 'Rizal', subject: 'Math', quarter: 'q1', startDate: '2026-10-02' },
    { activity: 'Quiz 1', section: 'Rizal', subject: 'Programming', quarter: 'q1', topicIdx: 0, unifiedIdx: 2, startDate: '2026-10-01', score: 45, max: 55 }
];
const context = { window: { AssessmentsPage: { buildAssessmentRows(role) { assert.equal(role, 'student'); return rows; } } }, sectionName: 'Rizal', subjectName: 'Programming' };
vm.runInNewContext(student.slice(start, end) + '\nglobalThis.bars = assessmentBars;', context);
assert.deepEqual(Array.from(context.bars, row => row.label), ['Task 1', 'Task 2', 'Quiz 1']);
assert.deepEqual(Array.from(context.bars.filter(row => row.quarter === '1'), row => row.label), ['Task 1', 'Task 2', 'Quiz 1']);
assert.equal(context.bars[1].score, null, 'Ungraded assessments follow topic card order');
assert.equal(context.bars[0].score, 80, 'Sorting does not change grades');
const sortStart = assessmentPage.indexOf('return uniqueRows.sort((a, b) => {');
const sortEnd = assessmentPage.indexOf('\n        });', sortStart) + '\n        });'.length;
const sorted = vm.runInNewContext('(function(){' + assessmentPage.slice(sortStart, sortEnd) + '})()', { uniqueRows: [...rows].reverse() });
assert.deepEqual(Array.from(sorted.filter(row => row.subject === 'Programming'), row => row.activity), ['Task 2', 'Task 1', 'Quiz 1']);
console.log('PASS: student grade performance follows topic material order, quarter-filter order, ungraded position, and score values; assessment list keeps release-date sorting.');
