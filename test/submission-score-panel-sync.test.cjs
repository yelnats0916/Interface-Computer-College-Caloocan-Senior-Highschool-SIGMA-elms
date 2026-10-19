const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/shared-components.js'), 'utf8');
const start = source.indexOf('window.resolveStudentAssessmentSubmissionDetails = function');
const end = source.indexOf('\n};', start) + '\n};'.length;
let seen;
const window = {
    _studentAssessmentDetailsCache: new Map(), _studentAssessmentDetailsCacheTime: Date.now(),
    resolveGradebookScoreColumn: () => ({ category: 'assignment', itemIdx: 0, item: { id: 'task-1', section: 'Newton' } }),
    getEffectiveAssessmentStatusAndScore: (student, cat, idx, subject, quarter, item) => {
        seen = { student, quarter, item };
        return { teacherSaved: true, score: quarter === 1 ? 80 : 60, status: quarter === 1 ? 'incomplete' : 'none' };
    },
    studentHasTurnedInWork: () => false,
    readScorePanelPoints: () => null
};
vm.runInNewContext(source.slice(start, end), { window, localStorage: { getItem: () => null } });
const student = { id: '2222222', name: 'Juan Abad Dela Cruz' };
const assessment = { id: 'task-1', title: 'Task 1', type: 'assignment', max: 100, quarter: 'q1' };
const details = window.resolveStudentAssessmentSubmissionDetails(assessment, 'prog', 0, 0, 'Rizal', student);
assert.equal(seen.item.section, 'Rizal', 'Explicit submission section overrides stale assessment section');
assert.equal(details.numericScore, 80);
assert.equal(details.attendanceTone, 'incomplete');
assert.equal(details.turnedIn, true, 'Saved teacher grade is recognized by panel lock logic');
const q2 = window.resolveStudentAssessmentSubmissionDetails({ ...assessment, quarter: 'q2' }, 'prog', 0, 0, 'Rizal', student);
assert.equal(q2.numericScore, 60, 'Quarter changes do not reuse old panel details');
assert.notEqual(q2.attendanceTone, 'incomplete');

const identityStart = source.indexOf('        const activeStudentObj = window.resolveRosterStudent');
const identityEnd = source.indexOf('        const studentName =', identityStart);
const identityWindow = {};
const resolverStart = source.indexOf('window.resolveRosterStudent = function');
vm.runInNewContext(source.slice(resolverStart, source.indexOf('\n};', resolverStart) + 4), { window: identityWindow });
vm.runInNewContext(source.slice(identityStart, identityEnd) + '\nwindow.selected = activeStudentObj;', {
    window: identityWindow, curStudentName: 'Dela Cruz, Juan Abad',
    rosterStudents: [student], getStudentNameTokens: s => [s.name.toLowerCase()]
});
assert.equal(identityWindow.selected.id, '2222222', 'Display name order retains real student identity');
console.log('PASS: submission panel reads saved score/status, uses explicit section and quarter, and retains student identity across name formats.');
