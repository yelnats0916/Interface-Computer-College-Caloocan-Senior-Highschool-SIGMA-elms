const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/shared-components.js'), 'utf8');
const window = { currentTopicState: { subjectId: 'programming', topicIdx: 2, selectedSection: 'Rizal', selectedStudent: 'Missing', activeTab: 'assessments' },
    _tcAssessmentDetailIdx: 1, location: { hash: ':submission' },
    getCurrentTopicAssessment: () => ({ id: 'task2' }),
    getStudentAssessmentSubmission: (subject, tab, idx, topic, item, student) => {
        assert.equal(subject, 'programming'); assert.equal(idx, 1); assert.equal(topic, 2); assert.equal(item.id, 'task2');
        return student === 'Done' ? { files: [{}] } : null;
    }, studentHasTurnedInWork: record => Boolean(record?.files?.length),
    getUnifiedSectionStudents: () => ['Missing', 'Done'], resolveRosterStudent: (list, name) => list.find(s => s === name),
    selectTopicStudent: name => { window.selected = name; }
};
const context = vm.createContext({ window });
function load(name, next) {
    const start = source.indexOf(`window.${name} =`);
    const end = source.indexOf(`\nwindow.${next} =`, start);
    vm.runInContext(source.slice(start, end), context);
}
load('hasCurrentAssessmentSubmission', 'selectTopicStudent');
load('renderAssessmentDetailTabsHtml', 'navigateToGradebookFromSubmission');
load('renderGradingStudentCoverHtml', 'placeGradingStudentCover');
const base = { role: 'student', subjectId: 'programming', topicIdx: 2, tab: 'assessments', activeIdx: 1 };
assert.equal(window.renderAssessmentDetailTabsHtml(base), '');
assert.equal(window.renderAssessmentDetailTabsHtml({ ...base, workActive: false, uploadActive: false }), '', 'Cancel without saved work must not reveal tabs');
assert.match(window.renderAssessmentDetailTabsHtml({ ...base, submitted: true, workActive: false, uploadActive: false }), /role="tablist"/, 'Saved work retains tabs after returning to Materials');
assert.equal(window.renderAssessmentDetailTabsHtml({ ...base, uploadActive: true }), '');
assert.match(window.renderAssessmentDetailTabsHtml({ ...base, submitted: true }), /My Submission/);
assert.match(window.renderAssessmentDetailTabsHtml({ ...base, submitted: true, isQuiz: true }), /My Attempt/);
assert.match(window.renderAssessmentDetailTabsHtml({ ...base, role: 'teacher' }), /Submissions/);
window.navigateTopicStudent(1); assert.equal(window.selected, 'Done');
window.currentTopicState.selectedStudent = 'Done';
window.navigateTopicStudent(-1); assert.equal(window.selected, 'Done');
const html = window.renderGradingStudentCoverHtml({ allStudents: ['Missing', 'Done'] });
assert.ok(html.indexOf('Submitted (1)') < html.indexOf('Done'));
assert.ok(html.indexOf('Not Submitted (1)') < html.indexOf('Missing'));
window.getUnifiedSectionStudents = () => ['Missing']; window.selected = null;
window.navigateTopicStudent(1); assert.equal(window.selected, null);
console.log('PASS: student tab lifecycle, quiz labels, grouped roster, submitted-only navigation, empty navigation');
