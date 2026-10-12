const assert = require('node:assert/strict');
const { validateCards, renderInsightSections } = require('../js/student-analytics.js');
const snapshot = { studentId: 'fixture', areas: [{ id: 'submissions', records: [{ id: 'record' }] }] };
const make = (category, actionLabel, extra = {}) => ({ area: 'submissions', title: 'Review Your Assessment Feedback', evidenceIds: ['record'],
    analyses: [{ category, actionLabel, text: 'Review your feedback.', ...extra }] });
const url = 'https://example.com/student.html';
for (const category of ['descriptive', 'predictive', 'prescriptive']) {
    for (const label of ['Advice', 'Recommend', 'Try']) {
        const card = validateCards({ cards: [make(category, label)] }, snapshot)[0];
        assert.equal(card.categories.length, 1);
        assert.equal(card.analyses.length, 1);
        assert.equal(card.analyses[0].category, category);
        assert.equal(card.analyses[0].actionLabel, label);
        const preview = renderInsightSections(card.analyses, url, false);
        assert.equal(preview, renderInsightSections(card.analyses, url));
        assert.equal(preview.includes(`<strong>${label}:</strong>`), label !== 'Advice');
    }
}
const advice = validateCards({ cards: [make('predictive', 'Advice', { showAdviceLabel: true, context: 'More dated results are needed.' })] }, snapshot)[0];
assert.match(renderInsightSections(advice.analyses, url, false), /needed\.<br><br><strong>Advice:<\/strong>/);
const multiple = make('descriptive', 'Advice');
multiple.analyses.push({ category: 'prescriptive', actionLabel: 'Try', text: 'Practise a task.' });
assert.throws(() => validateCards({ cards: [multiple] }, snapshot), /exactly one analysis type/);
assert.throws(() => validateCards({ cards: [make('descriptive', ['Advice', 'Try'])] }, snapshot), /exactly one action label/);
assert.throws(() => validateCards({ cards: [make('predictive', null)] }, snapshot), /exactly one action label/);
console.log('All nine single-type/single-label combinations, Advice visibility, and matching views passed');
