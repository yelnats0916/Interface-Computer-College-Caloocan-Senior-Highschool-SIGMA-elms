const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/shared-components.js'), 'utf8');
const start = source.indexOf('window.navigateToGradebookFromSubmission =');
const end = source.indexOf('window.switchTopicSubmissionAssessment =', start);
const items = Array.from({ length: 7 }, (_, index) => ({ id: `assessment-${index}`, title: index === 1 || index === 5 ? 'Quiz 1' : `Task ${index}`, topicIdx: index, itemIdx: index }));
let lookedUp;
let navigation;
const window = {
    location: { pathname: '/admin.html' },
    sigmaGradesState: { activeQuarter: 1, mobileAssessmentSummary: true },
    getSubjectById: () => ({ name: 'Programming' }),
    getEffectiveTeacher: () => ({ id: 'teacher-1' }),
    getTeacherAssignedSubjectsAndSections: () => [{ subject: 'Programming', sectionName: 'Rizal' }],
    getCategoryDetails(view, quarter, subject, section) { lookedUp = { view, quarter, subject, section }; return items; },
    switchTab(...args) { navigation = args; }
};
const context = vm.createContext({ window, setTimeout() {}, document: {} });
vm.runInContext(source.slice(start, end), context);
window.navigateToGradebookFromSubmission('prog', 'Rizal', encodeURIComponent('Quiz 1'), 'Written Works', 'quiz', 0, { itemId: 'assessment-5', quarter: 'q2', topicIdx: 5 });
assert.equal(window.sigmaGradesState.assessmentPage, 1, 'Desktop displays the group containing assessment 5');
assert.equal(window.sigmaGradesState.mobileAssessmentSlot, 1, 'Mobile displays assessment 5 rather than group-first assessment 4');
assert.equal(window.sigmaGradesState.mobileAssessmentSummary, false);
assert.equal(window.sigmaGradesState.activeQuarter, 2);
assert.equal(window._pendingGradebookDetail.mobileAssessmentSlot, 1);
assert.equal(window._pendingGradebookDetail.quarter, 2);
assert.deepEqual(lookedUp, { view: 'ww', quarter: 2, subject: 'Programming', section: 'Rizal' });
window.navigateToGradebookFromSubmission('prog', 'Rizal', encodeURIComponent('Quiz 1'), 'Written Works', 'quiz', 0, { itemId: 'assessment-1', quarter: 1, topicIdx: 1 });
assert.equal(window.sigmaGradesState.assessmentPage, 0);
assert.equal(window.sigmaGradesState.mobileAssessmentSlot, 1);
assert.deepEqual(navigation, ['nav-school-grades', false, 'gradebook'], 'Admin button changes to the admin Grades route');
const buttonStart = source.indexOf('<button type="button" class="sigma-btn sigma-btn-primary teacher-view-gradebook-btn"');
const buttonEnd = source.indexOf('</button>', buttonStart) + '</button>'.length;
const buttonContext = vm.createContext({ window, subjectId: 'prog', section: 'Rizal', currentItem: items[5], assCat: 'quiz', tab: 'assessments', actIdx: 2, topicIdx: 5 });
vm.runInContext('window.buttonMarkup = `' + source.slice(buttonStart, buttonEnd) + '`;', buttonContext);
const markup = window.buttonMarkup;
assert.ok(!markup.includes('teacher-submission-action-area'), 'View Gradebook does not depend on an absent teacher-only node');
const target = markup.match(/data-gradebook-target="([^"]+)"/)[1];
const handler = markup.match(/onclick="([^"]+)"/)[1];
let buttonArgs;
window.navigateToGradebookFromSubmission = (...args) => { buttonArgs = args; };
vm.runInContext('(function () { ' + handler + ' }).call({ dataset: { gradebookTarget: ' + JSON.stringify(target) + ' } });', buttonContext);
assert.equal(buttonArgs[6].itemId, 'assessment-5', 'Actual button handler carries the exact assessment identity');
assert.equal(buttonArgs[1], 'Rizal');
console.log('PASS: View Gradebook targets exact assessment identity, mobile column, desktop page, quarter, section and subject');
