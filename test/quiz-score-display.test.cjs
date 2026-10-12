const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('js/shared-components.js', 'utf8');
let accepted = true;
const window = {
    _activeReviewSubData: { essayScores: { 0: 5 } },
    questionScoreAccepted: () => accepted,
    readAcceptedQuestionScore: scores => scores[0],
    _editingReviewScores: new Set()
};
const context = vm.createContext({ window, isTeacherUser: true, _isReviewMode: true,
    _isTeacherPreviewMode: false, isAutoScoring: false });
const start = source.indexOf('        const renderTeacherScoringPanelHtml =');
const end = source.indexOf('\n        updateTeacherGradingButtonState();', start);
vm.runInContext(source.slice(start, end) + '\nthis.renderPanel = renderTeacherScoringPanelHtml;', context);
let html = context.renderPanel(0, 5);
assert.match(html, /Earned: 5 points/);
assert.match(html, /aria-label="Edit score for question 1"/);
assert.doesNotMatch(html, /type="number"|Save Score/);
window._editingReviewScores.add(0);
html = context.renderPanel(0, 5);
assert.match(html, /value="5"/);
assert.match(html, /Save Score/);
assert.match(html, /Edit Score/);
accepted = false;
assert.match(context.renderPanel(0, 5), /Assign Score/);
context.isTeacherUser = false;
assert.equal(context.renderPanel(0, 5), '');
console.log('PASS: accepted score display, accessible edit icon, populated editor and Save Score label');
