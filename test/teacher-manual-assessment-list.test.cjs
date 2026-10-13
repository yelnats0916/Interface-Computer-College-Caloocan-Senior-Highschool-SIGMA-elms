const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/teacher.js'), 'utf8');
const start = source.indexOf('    function getCategoryDetails(category,');
const end = source.indexOf('    function isGradebookDateEditable', start);
const manual = { id: 'offline-test', title: 'Paper Quiz', category: 'ww', createdAt: '2026-10-13T08:00:00Z', max: 80, offline: true };
const window = { getOfflineAssessments: (subject, section, quarter, category) =>
    subject === 'prog1' && section === 'Rizal' && quarter === 1 && category === 'ww' ? [manual] : [] };
vm.runInNewContext(source.slice(start, end), { window, _categoryDetailsCache: {},
    gradebookState: { selectedSubject: 'prog1', selectedSection: 'Rizal', currentQuarter: 1 },
    getAssessmentsForSubject: () => [], currentTopicState: {} });
const result = window.getCategoryDetails('ww', 1, 'prog1', 'Rizal');
assert.equal(result.length, 1);
assert.equal(result[0].id, manual.id);
assert.equal(result[0].rawItem, manual);
assert.equal(window.getCategoryDetails('qa', 1, 'prog1', 'Rizal').length, 0);
console.log('PASS: teacher override includes saved Manual records in their scoped component.');
