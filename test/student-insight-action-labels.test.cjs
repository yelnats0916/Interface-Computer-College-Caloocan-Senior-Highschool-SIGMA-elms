const assert = require('node:assert/strict');
const { ACTION_LABELS, normalizeActionLabel, stripActionLabels, renderAnalysis, validateCards } = require('../js/student-analytics.js');
const url = 'https://example.com/student.html';
for (const label of ACTION_LABELS) {
    assert.equal(normalizeActionLabel(label.toLowerCase()), label);
    const rendered = renderAnalysis({ category: 'prescriptive', actionLabel: label, showAdviceLabel: true, text: '**Try:**\nReview your feedback.' }, url);
    assert.equal(rendered, `<strong>${label}:</strong> Review your feedback.`);
    assert.equal((rendered.match(/<strong>/g) || []).length, 1);
}
assert.equal(normalizeActionLabel(['Advice', 'Try']), null);
assert.equal(normalizeActionLabel('unknown'), null);
assert.equal(stripActionLabels('Your average is **82%**.\n\n**Try:**\nReview feedback.'), 'Your average is **82%**.\n\nReview feedback.');
assert.equal(renderAnalysis({ category: 'descriptive', actionLabel: 'Try', text: 'Review your feedback.' }, url), '<strong>Try:</strong> Review your feedback.');
const snapshot = { studentId: 'fixture', areas: [{ id: 'submissions', records: [{ id: 'record' }] }] };
const card = { area: 'submissions', title: 'Review Variable Declarations', evidenceIds: ['record'],
    analyses: [{ category: 'prescriptive', actionLabel: 'Recommend', text: 'Review feedback.' }] };
assert.equal(validateCards({ cards: [card] }, snapshot)[0].analyses[0].actionLabel, 'Recommend');
console.log('Advice/Recommend/Try selection and consistent body labels passed');
