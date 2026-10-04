const assert = require('node:assert/strict');
const { summarizeScores, renderBody } = require('../js/student-analytics.js');
const score = (subjectId, subject, value, gradedAt) => ({
    subjectId, subject, score: value, maximumScore: 20,
    status: 'graded', title: 'Quiz', gradedAt
});

assert.equal(summarizeScores([]), null);
assert.equal(summarizeScores([{ ...score('a', 'A', 10), status: 'submitted' }]), null);
assert.equal(summarizeScores([{ ...score('a', 'A', 10), maximumScore: 0 }]), null);
const summary = summarizeScores([
    score('a', 'Programming', 16, '2026-10-01'),
    score('a', 'Programming', 18, '2026-10-02'),
    score('b', 'Communication', 10, '2026-10-01'),
    score('b', 'Communication', 8, '2026-10-02')
]);
assert.match(summary.text, /Programming: \+10 percentage points/);
assert.match(summary.text, /Communication: -10 percentage points/);
assert.match(summary.text, /Communication has your lowest assessment average \(45%\)/);
assert.match(summary.text, /Next step:.*Quiz \(40%\)/);
assert.match(summarizeScores([score('a', 'A', 0)]).text, /average in A is 0%/);
assert.match(summarizeScores([score('a', 'A', 10), score('a', 'A', 12)]).text, /More dated/);
assert.match(renderBody(summarizeScores([score('a', '<script>', 10)]).text,
    'https://example.com/student.html'), /&lt;script&gt;/);
console.log('Student cross-subject summary tests passed.');
