const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const shared = fs.readFileSync('js/shared-components.js', 'utf8');
const analytics = fs.readFileSync('js/sigma-analytics.js', 'utf8');
const records = [
    { id: 'qa-1', offline: true, subjectId: 'Programming', section: 'Rizal', quarter: 1, category: 'qa', max: 80, scores: { student: 60 } },
    { id: 'qa-2', offline: true, subjectId: 'Programming', section: 'Rizal', quarter: 1, category: 'qa', max: 20, scores: { student: 20 } },
    { id: 'pt-1', offline: true, subjectId: 'Programming', section: 'Rizal', quarter: 1, category: 'perf. task', max: 100, scores: { student: 100 } }
];
const window = { getStudentFullAliases: student => [student.id], getAssessmentsForSubject: () => [] };
const context = vm.createContext({ window, localStorage: { getItem: () => JSON.stringify(records) }, _sharedCategoryDetailsCache: {} });
vm.runInContext(fs.readFileSync('js/offline-assessments.js', 'utf8'), context);
for (const name of ['getCategoryDetails', 'getGradebookStudentItemScore', 'calculateGradebookCategoryPercentage']) {
    const start = shared.indexOf(`window.${name} = function`);
    vm.runInContext(shared.slice(start, shared.indexOf('\n};', start) + 4), context);
}
window.getAdminGradebookStudentItemScore = window.getGradebookStudentItemScore;
const percentage = () => window.calculateGradebookCategoryPercentage({ id: 'student' }, 'qa', 'Programming', 1, 'Rizal');
assert.equal(percentage(), 80, 'Manual QA uses earned points / HPS across QA assessments');
for (const weight of [20, 30, 0]) {
    context.weights = { qa: weight };
    for (const expression of analytics.matchAll(/const qaWeight = ([^;]+);/g)) {
        vm.runInContext(`this.weighted = 80 * (${expression[1]});`, context);
        assert.equal(context.weighted, 80 * weight / 100, 'Configured QA weight applies, including zero');
    }
}
assert.equal(window.calculateGradebookCategoryPercentage({ id: 'student' }, 'qa', 'Programming', 2, 'Rizal'), null);
assert.equal(window.calculateGradebookCategoryPercentage({ id: 'student' }, 'qa', 'Programming', 1, 'Other'), null);
records[0].scores.student = 0;
assert.equal(percentage(), 20, 'Saved manual zero score is included');
delete records[0].scores.student;
assert.equal(percentage(), 100, 'Unscored manual assessment stays blank');
console.log('PASS: manual QA scores, HPS, configured weights and section/quarter isolation');

const stores = {
    'sigma-admin-subjects': JSON.stringify([{ id: 'subj-programming', code: 'ICT204', name: 'Programming', weights: { ww: 20, pt: 50, qa: 30 } }]),
    'sigma-gradebook-subject-weights': JSON.stringify({ Programming: { ww: 30, pt: 50, qa: 20 } })
};
const weightWindow = { getDefaultWeightsForSubject: () => ({ ww: 25, pt: 50, qa: 25 }) };
const weightContext = vm.createContext({ window: weightWindow, localStorage: { getItem: key => stores[key] || null } });
const weightStart = shared.indexOf('window.getSubjectGradebookWeights = function');
vm.runInContext(shared.slice(weightStart, shared.indexOf('\n};', weightStart) + 4), weightContext);
for (const alias of ['Programming', 'ICT204', 'subj-programming', 'card-programming']) {
    assert.equal(JSON.stringify(weightWindow.getSubjectGradebookWeights(alias)), JSON.stringify({ ww: 20, pt: 50, qa: 30 }));
}
records.push({ id: 'ww-1', offline: true, subjectId: 'Programming', section: 'Rizal', quarter: 1, category: 'ww', max: 100, scores: { student: 80 } });
context._sharedCategoryDetailsCache = {};
records[0].scores.student = 60;
const subjectWeights = weightWindow.getSubjectGradebookWeights('ICT204');
const percentages = ['ww', 'perf. task', 'qa'].map(category => window.calculateGradebookCategoryPercentage({ id: 'student' }, category, 'Programming', 1, 'Rizal'));
assert.deepEqual(Array.from(percentages), [80, 100, 80]);
assert.equal(percentages[0] * subjectWeights.ww / 100 + percentages[1] * subjectWeights.pt / 100 + percentages[2] * subjectWeights.qa / 100, 90);
console.log('PASS: admin subject weights override stale weights for name/code/ID; manual WW/PT/QA contribute 16 + 50 + 24 = 90');
window.getAssessmentsForSubject = (_subject, category) => category === 'qa'
    ? [{ id: 'online-qa', category: 'qa', max: 20, savedScore: 10 }] : [];
window.getAdminGradebookStudentItemScore = (student, category, index, item, subject, quarter) => item.offline
    ? window.getGradebookStudentItemScore(student, category, index, item, subject, quarter) : item.savedScore;
context._sharedCategoryDetailsCache = {};
assert.equal(percentage(), 75, 'Online and manual QA share the same points/HPS aggregation');
assert.equal(percentage() * subjectWeights.qa / 100, 22.5, 'Mixed QA applies the admin QA weight once');
console.log('PASS: online plus manual QA use the same admin-assigned component weight');
