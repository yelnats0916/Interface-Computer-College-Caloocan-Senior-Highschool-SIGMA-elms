const assert = require('node:assert/strict');
const { normalizeInsightTitle, validateCards, TITLE_RULES, summarizeScores } = require('../js/student-analytics.js');
for (const title of ['Programming Scores Improved', 'More Results Needed', 'Review Variable Declarations']) {
    assert.equal(normalizeInsightTitle(title), title);
}
assert.equal(normalizeInsightTitle('  Review   Variable Declarations '), 'Review Variable Declarations');
for (const title of [null, '', 'Progress', 'One Two Three Four Five Six Seven', 'x'.repeat(65),
    '**Review Variable Declarations**', '<script> Bad Title Here', 'You Will Fail Tomorrow', 'Guaranteed Success For Everyone',
    'Predictive Assessment Progress']) assert.equal(normalizeInsightTitle(title), 'Your Learning Update');
const snapshot = { studentId: 'fixture', areas: [{ id: 'submissions', records: [{ id: 'record-one' }] }] };
const card = { area: 'submissions', title: 'Review Variable Declarations', evidenceIds: ['record-one'],
    analyses: [{ category: 'prescriptive', actionLabel: 'Recommend', text: 'Review feedback for the task.' }] };
assert.equal(validateCards({ cards: [card] }, snapshot)[0].title, card.title);
assert.equal(validateCards({ cards: [{ ...card, title: null }] }, snapshot)[0].title, 'Your Learning Update');
assert.throws(() => validateCards({ cards: [{ ...card, evidenceIds: ['unknown-record'] }] }, snapshot), /evidence/);
assert.match(TITLE_RULES, /3 to 6 words/);
assert.match(TITLE_RULES, /grounded/);
assert.equal(summarizeScores([{ status: 'graded', subjectId: 'course', subject: 'Programming', score: 82, maximumScore: 100, title: 'Task' }]).title, 'Your Assessment Summary');
console.log('Provider titles, safe fallbacks, record-summary title, and evidence validation passed');
