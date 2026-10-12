const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const analytics = fs.readFileSync('js/sigma-analytics.js', 'utf8');
const teacher = fs.readFileSync('js/teacher.js', 'utf8');
const items = [{ max: 100 }, { max: 100 }, { max: 55 }];

for (const [scores, expectedHPS, expectedPct] of [
    [[70, null, 25], 155, '61.29'],
    [[70, '-', 25], 155, '61.29'],
    [[70, '', 25], 155, '61.29'],
    [[70, 0, 25], 255, '37.25'],
    [[70, 80, 25], 255, '68.63'],
    [[null, null, null], 0, null]
]) {
    for (const [name, source, endMarker, hasAny] of [
        ['shared', analytics, '// Render the 4 task slots', 'rowHasAny'],
        ['teacher', teacher, '// Render the 4 task slots', 'rowHasAnyScore']
    ]) {
        const start = source.indexOf('            let rowScoreSum = 0;');
        const end = source.indexOf(endMarker, start);
        const window = {
            getAdminGradebookStudentItemScore: (_s, _cat, idx) => scores[idx],
            getEffectiveAssessmentStatusAndScore: () => ({}),
            studentHasAssessmentSubmission: () => false
        };
        const context = vm.createContext({ window, items, s: {}, student: {}, detailCategory: 'ww',
            subjectId: 'subject', subSec: { subject: 'subject' }, currentQ: 1,
            getAdminGradebookStudentItemScore: window.getAdminGradebookStudentItemScore });
        vm.runInContext(source.slice(start, end) + `
            this.result = { scoredHPS, pct: ${hasAny} && scoredHPS > 0 ? (rowScoreSum / scoredHPS * 100).toFixed(2) : null };`, context);
        assert.equal(context.result.scoredHPS, expectedHPS, name);
        assert.equal(context.result.pct, expectedPct, name);
    }
    const cells = [{}, {}];
    const tr = { tagName: 'TR', closest: () => true,
        querySelector: selector => ({ textContent: selector.includes('id') ? 'ID: student' : 'Student' }),
        querySelectorAll: () => cells };
    const window = { sigmaGradesState: { currentView: 'ww' } };
    const context = vm.createContext({ window, getAdminGradebookAssessmentItems: () => items,
        getAdminGradebookStudentItemScore: (_s, _cat, idx) => scores[idx] });
    const start = analytics.indexOf('    window.refreshAdminGradebookRow =');
    const end = analytics.indexOf('    window.toggleMobileGradeTotals', start);
    vm.runInContext(analytics.slice(start, end), context);
    window.refreshAdminGradebookRow(tr);
    if (expectedPct === null) assert.match(cells[1].innerHTML, /gradebook-dash/);
    else assert.equal(cells[1].textContent, expectedPct + '%');
}
assert.equal(items.reduce((sum, item) => sum + item.max, 0), 255);
console.log('PASS: blank/dash excluded, zero included, shared/teacher totals and live refresh agree; assigned HPS stays 255');
