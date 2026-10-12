const assert = require('node:assert/strict');
const { collect } = require('../js/student-submission-analytics.js');
const classes = [{ id: 'programming', subject: 'Programming', section: 'Rizal' }];
const row = { cardId: 'programming', subjectId: 'programming', subject: 'Programming', section: 'Rizal', activity: 'Quiz 1',
    topicIdx: 0, tab: 'assessments', itemIdx: 0, unifiedIdx: 0, score: 0, max: 20 };
assert.deepEqual(collect('s1', classes, [row]).records[0].sources.map(source => source.label),
    ['Submission Records', 'Assessment Results'], 'Recorded zero is still an assessment result');
for (const score of [null, '', undefined]) {
    assert.deepEqual(collect('s1', classes, [{ ...row, score }]).records[0].sources.map(source => source.label),
        ['Submission Records'], 'Missing scores do not claim assessment results');
}
assert.equal(collect('s1', classes, [{ ...row, section: 'Other' }]).records.length, 0);
console.log('PASS: student source metadata follows actual score evidence and enrolled scope.');
