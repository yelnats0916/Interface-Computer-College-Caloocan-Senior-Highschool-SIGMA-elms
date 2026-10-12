const assert = require('node:assert/strict');
const { INSIGHT_ICONS, normalizeInsightIcon, validateCards } = require('../js/student-analytics.js');
assert.equal(Object.keys(INSIGHT_ICONS).length, 16);
for (const [name, icon] of Object.entries(INSIGHT_ICONS)) {
    assert.equal(normalizeInsightIcon(name), name);
    assert.match(icon.className, /^fa-[a-z-]+$/);
    assert.equal(icon.className.includes(' '), false, 'Exactly one approved icon class');
}
for (const input of [undefined, null, ['trend', 'review'], 'trend review', '<svg>', '__proto__']) {
    assert.equal(normalizeInsightIcon(input), 'progress');
}
const snapshot = { studentId: 'fixture', areas: [{ id: 'submissions', records: [{ id: 'record' }] }] };
const card = { area: 'submissions', title: 'Review Variable Declarations', evidenceIds: ['record'],
    analyses: [{ category: 'prescriptive', actionLabel: 'Recommend', text: 'Review the feedback.' }], icon: 'review' };
assert.equal(validateCards({ cards: [card] }, snapshot)[0].icon, 'review');
assert.equal(validateCards({ cards: [{ ...card, icon: ['review', 'trend'] }] }, snapshot)[0].icon, 'progress');
console.log('16 approved insight icons, single-icon selection, and safe fallback passed');
