const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/student-analytics.js'), 'utf8');
const saved = { lastAnalyzed: Date.parse('2026-10-07T11:00:00Z'), cards: [] };
const window = { getLoggedInStudentUser: () => ({ id: 'student-fixture' }), location: { href: 'http://localhost/student.html' } };
const context = { window, URL, localStorage: { getItem: () => JSON.stringify(saved) },
    document: { readyState: 'loading', addEventListener() {}, querySelectorAll: () => [] },
    setTimeout() {}, clearTimeout() {} };
vm.createContext(context);
vm.runInContext(source, context);
window.SigmaStudentAnalytics.registerArea('submissions', () => ({ studentId: 'student-fixture', records: [
    { subjectId: 'subject-fixture', subject: 'Programming', score: 82, maximumScore: 100, status: 'graded', title: 'Task' }
] }));
const card = window.SigmaStudentAnalytics.getCards()[0];
assert.equal(card.datePlacement, 'footer');
assert.match(card.date, /Oct 7, 2026/);
assert.match(card.date, /7:00 PM/);
assert.equal(card.subject, 'All Subjects');
assert.equal(card.concernTitle, 'Your Assessment Summary');
assert.equal(card.sourceLabel, undefined);
assert.ok(card.concernText.startsWith('Your assessment average'));
const rendererSource = fs.readFileSync(path.join(root, 'js/sigma-analytics.js'), 'utf8');
const renderer = rendererSource.slice(rendererSource.indexOf('    function renderSigmaGradeMonitoringCardHtml('), rendererSource.indexOf('    function createSigmaCardElement('));
vm.runInContext(renderer, context);
const html = context.renderSigmaGradeMonitoringCardHtml(card);
assert.match(html, /class="sigma-card-date"/);
assert.equal(html.includes('Record summary'), false);
assert.equal(html.includes('sigma-insight-scroll'), false);
assert.match(html, /class="sigma-insight-open"/);
assert.match(html, /template class="sigma-insight-full-content"/);
assert.equal(card.previewText.includes('Try:'), true);
assert.equal(html.includes('sigma-insight-subject-icon'), false);
assert.equal(html.includes('<h5'), false);
assert.equal(html.includes('All Subjects'), false);
assert.match(html, /sigma-insight-header/);
assert.match(html, /sigma-insight-title/);
assert.match(html, /sigma-insight-actions/);
assert.equal(html.includes('w-8 h-8 rounded-lg'), false);
assert.equal(html.slice(0, html.indexOf('<!-- Card Body:')).includes(card.date), false);
assert.ok(html.indexOf('class="sigma-card-date"') > html.indexOf('class="sigma-card-body'));
assert.ok(html.indexOf('class="sigma-card-date"') < html.indexOf('<!-- Bottom Accent Line -->'));
assert.equal(source.includes('Last analyzed:'), false);
delete saved.lastAnalyzed;
assert.equal(window.SigmaStudentAnalytics.getCards()[0].date, '');
console.log('Student analysis timestamp uses Manila time and renders inside the card footer');
saved.usedProvider = true;
saved.cards = [{ id: 'insight-fixture', title: 'Review Variable Declarations', icon: 'review',
    analyses: [{ category: 'descriptive', actionLabel: 'Try', context: 'The latest recorded assessment average is 82%.', text: 'Review the variable declaration feedback.' }] }];
window.SigmaStudentAnalytics.setProvider(() => {});
let providerCard = window.SigmaStudentAnalytics.getCards()[0];
assert.equal(providerCard.previewText.includes('Try:'), true);
assert.equal(providerCard.concernText.includes('Try:'), true);
saved.cards[0].analyses = [{ category: 'predictive', actionLabel: 'Advice', text: 'Review the variable declaration feedback.' }];
providerCard = window.SigmaStudentAnalytics.getCards()[0];
assert.equal(providerCard.previewText.includes('Advice:'), false, 'Advice label is optional in both views');
assert.equal(providerCard.previewText.includes('Review the variable declaration feedback.'), true, 'Advice text remains in the preview');
if (process.argv.includes('--preview')) {
    const previewCard = { ...card, concernTitle: 'Your assessment progress across every enrolled subject', previewText: card.previewText.repeat(3), concernText: card.concernText + '<br><br>Review your assessment feedback before the next activity. Check the topics where you lost points, then practise a similar task. Compare the next result with your current assessment average.' };
    const preview = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Insight Layout Test</title><link rel="stylesheet" href="../css/tailwind.css"><link rel="stylesheet" href="../css/student.css"><link rel="stylesheet" href="../css/sigma-analytics.css"><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"></head><body style="display:grid;place-items:center;padding:24px;background:#f8fafc;min-height:100vh"><main style="width:320px;max-width:100%">' + context.renderSigmaGradeMonitoringCardHtml(previewCard) + '</main><script src="../js/student-insight-view.js"></script></body></html>';
    fs.writeFileSync(path.join(__dirname, 'student-insight-scroll.html'), preview.replace('display:grid;place-items:center;', 'display:grid;grid-template-columns:minmax(0,1fr);place-items:center;box-sizing:border-box;'));
}
