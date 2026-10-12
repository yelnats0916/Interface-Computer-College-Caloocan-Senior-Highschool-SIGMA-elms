const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('js/shared-components.js', 'utf8');
const start = source.indexOf('window.navigateTopicStudent = function');
const end = source.indexOf('window.renderGradingStudentCoverHtml', start);
const students = [{ name: 'Juan' }, { name: 'Herald' }];
const rendered = [];
const window = {
    currentTopicState: { subjectId: 'prog1', selectedSection: 'Rizal', selectedStudent: 'Juan' },
    location: { hash: ':submission' },
    getUnifiedSectionStudents: () => students,
    hasCurrentAssessmentSubmission: () => true,
    resolveRosterStudent: (roster, name) => roster.find(s => s.name === name),
    renderAdminTopicContentWorkstation: () => rendered.push(window.currentTopicState.selectedStudent)
};
const context = vm.createContext({
    window,
    document: {
        querySelectorAll: () => [],
        getElementById: id => id === 'section-topic-content'
            ? { classList: { contains: () => false } } : null
    },
    setTimeout: () => {}
});
vm.runInContext(source.slice(start, end), context);
window.navigateTopicStudent(1);
assert.equal(window.currentTopicState.selectedStudent, 'Herald');
window.navigateTopicStudent(-1);
assert.equal(window.currentTopicState.selectedStudent, 'Juan');
assert.deepEqual(rendered, ['Herald', 'Juan']);
console.log('PASS: admin Next and Prev update selection and refresh the workstation.');
