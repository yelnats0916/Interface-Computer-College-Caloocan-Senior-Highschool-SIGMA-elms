const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/student.js'), 'utf8');
const extract = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const items = [
    { id: 'task', title: 'Released Task', itemIdx: 0 },
    { id: 'draft', title: 'Draft Task', itemIdx: 1 },
    { id: 'quiz', title: 'Released Quiz', itemIdx: 2 },
    { id: 'hidden', itemIdx: 3 },
    { id: 'unassigned', itemIdx: 4 }
];
let rendered;
let unavailable = false;
const window = {
    getUnifiedTopicAssessments: (_tab, _subject, _topic, defaults, section) => {
        assert.equal(section, 'Rizal');
        assert.ok(defaults.some(item => item.id === 'quiz'), 'Topic defaults are included in both views');
        return items;
    },
    getStudentAssessmentReleaseStatus: (_subject, item, _topic, index) => {
        assert.equal(index, item.itemIdx, 'Access uses the original release index');
        return { isLocked: item.id === 'unassigned', isHidden: item.id === 'hidden', isUnreleased: item.id === 'draft' };
    },
    resolveStudentAssessmentSection: () => 'Rizal',
    renderSharedAssessmentsTabHtml: args => { rendered = args; return 'assessment'; },
    _scAssessmentDetailIdx: 1
};
const topic = { assignments: items.slice(0, 2), quiz: [items[2]] };
const context = vm.createContext({ window, topic, console, location: { hash: '' }, showUnavailableStudentMaterial: () => { unavailable = true; } });
vm.runInContext(extract('    function getAccessibleStudentTopicAssessments(', '        window.openTopicContent ='), context);
vm.runInContext(extract('    function _buildAssessmentTab(', '    function _buildComingSoonTab('), context);
vm.runInContext("_buildAssessmentTab('assessments', {}, topic, {}, 'card-prog1', 0)", context);
assert.deepEqual(Array.from(rendered.assessments, item => item.id), ['task', 'quiz']);
assert.equal(rendered.assessments[rendered.activeIdx].id, 'quiz');
const renderer = extract('    function _renderTopicContentMain(', '    function _buildAssessmentTab(');
const guard = renderer.slice(renderer.indexOf('        const assessmentTabs ='), renderer.indexOf('        const config ='));
Object.assign(context, { effectiveTab: 'assessments', effectiveSubjectId: 'card-prog1', queryIdx: 0, hashItemIdx: null, _tcVideoIdx: null });
vm.runInContext(`(() => { ${guard} })()`, context);
assert.equal(unavailable, false, 'Visible quiz at index 1 opens instead of checking the draft at index 1');
window._scAssessmentDetailIdx = 9;
vm.runInContext(`(() => { ${guard} })()`, context);
assert.equal(unavailable, true, 'Invalid detail indices remain unavailable');
window.getUnifiedTopicAssessments = () => [];
assert.equal(vm.runInContext("getAccessibleStudentTopicAssessments('card-prog1', 0, topic, 'Rizal').length", context), 0, 'Empty section results do not fall back to another section');
console.log('PASS: student list and detail share accessible assessments, original release indices, and section restrictions');
