const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/admin.js'), 'utf8');
const start = source.indexOf("            const savedState = (typeof window.loadSigmaGradesState");
const last = "            window.switchTab('nav-school-grades', true);";
const end = source.indexOf(last, start) + last.length;
assert(start > 0 && end > start);
for (const hash of ['nav-school-grades', 'grades', 'school-grades', 'nav-grades', 'school-grades:gradebook', 'school-grades:analytics', 'analytics']) {
    const window = {
        sigmaGradesState: { activeTab: 'analytics' },
        loadSigmaGradesState: () => ({ activeTab: 'analytics' }),
        switchTab: () => {}
    };
    vm.runInNewContext(source.slice(start, end), { window, hash });
    const expected = hash.includes('analytics') ? 'analytics' : 'gradebook';
    assert.equal(window.sigmaGradesState.activeTab, expected, hash);
    assert.equal(window._adminGradesEntryTab, expected, hash);
}
const shared = fs.readFileSync(path.join(__dirname, '../js/sigma-analytics.js'), 'utf8');
const navStart = shared.indexOf('    window.syncSharedGradesNavigation = function');
const navEnd = shared.indexOf('    function loadSigmaGradesState', navStart);
const window = { sigmaGradesState: { activeTab: 'analytics' }, resetSigmaGradebookPage: () => {} };
vm.runInNewContext(shared.slice(navStart, navEnd), { window });
assert.equal(window.syncSharedGradesNavigation({ enteringGrades: true, gradesWasVisible: true, role: 'admin', explicitTab: 'gradebook' }).targetTab, 'gradebook');
assert.equal(window.syncSharedGradesNavigation({ enteringGrades: true, role: 'admin', explicitTab: 'analytics' }).targetTab, 'analytics');
console.log('PASS: plain admin Grades routes default to Gradebooks; explicit Analytics remains accessible');
