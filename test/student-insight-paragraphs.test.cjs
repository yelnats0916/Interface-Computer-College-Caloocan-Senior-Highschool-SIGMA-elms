const assert = require('node:assert/strict');
const { renderInsightSections, summarizeScores, renderBody } = require('../js/student-analytics.js');
const url = 'https://example.com/student.html';
const analyses = [
    { category: 'descriptive', actionLabel: 'Advice', context: 'Your average is 82%. More records are needed for a trend.', text: 'Review your quiz feedback.', showAdviceLabel: true }
];
assert.equal(renderInsightSections(analyses, url), 'Your average is 82%. More records are needed for a trend.<br><br><strong>Advice:</strong> Review your quiz feedback.');
assert.equal(renderInsightSections(analyses, url, false), renderInsightSections(analyses, url));
assert.equal(renderInsightSections([{ category: 'descriptive', text: 'First paragraph.\n\nSecond paragraph.' }], url), 'First paragraph.<br><br>Second paragraph.');
const summary = summarizeScores([{ subjectId: 'prog', subject: 'Programming', status: 'graded', score: 82, maximumScore: 100, title: 'Quiz' }]);
assert.match(summary.text, /82%\. More dated/);
assert.match(renderBody(summary.text, url), /trends\.<br><br><strong>Try:<\/strong> /);
console.log('Explanation flows together; action sections and intentional AI paragraph breaks remain separate');
