const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/shared-components.js'), 'utf8');
const extract = name => {
    const start = source.indexOf(`window.${name} = function`);
    return source.slice(start, source.indexOf('\n};', start) + 4);
};
const students = [
    { id: '2222222', name: 'Dela Cruz, Juan Abad' },
    { id: '26010314', name: 'Kalipungan, Herald Jamero' }
];
let sections = [{ name: 'Rizal', subject: 'Computer Programming 1', students }];
const window = {
    currentTopicState: { subjectId: 'card-prog1', selectedSection: 'Rizal', selectedStudent: 'Juan Abad Dela Cruz' },
    getStoredJson: (key, fallback) => key === 'sigma-admin-sections' ? sections : fallback,
    getTopicSubject: id => ['card-prog1', 'prog1'].includes(id)
        ? { id: 'prog1', name: 'Computer Programming 1' } : { id, name: 'Other Subject' },
    formatStudentLastFirstMiddle: student => student.name,
    selectTopicStudent: name => { window.currentTopicState.selectedStudent = name; }
};
vm.runInNewContext(extract('resolveRosterStudent') + '\n' + extract('getUnifiedSectionStudents') + '\n' + extract('navigateTopicStudent'), { window });
assert.deepEqual(Array.from(window.getUnifiedSectionStudents('Rizal'), s => s.id), ['2222222', '26010314']);
window.navigateTopicStudent(1);
assert.equal(window.currentTopicState.selectedStudent, students[1].name, 'Next advances from reordered display name');
window.navigateTopicStudent(-1);
assert.equal(window.currentTopicState.selectedStudent, students[0].name, 'Prev returns to first student');
assert.equal(window.getUnifiedSectionStudents('Rizal', 'math').length, 0, 'Unrelated subject remains excluded');
sections = [{ name: 'Rizal', assignedSubjects: ['Other Subject', { id: 'prog1', name: 'Computer Programming 1' }], students }];
assert.equal(window.getUnifiedSectionStudents('Grade 11 - Rizal').length, 2, 'All assigned subjects are checked');
sections = [{ name: 'Rizal', students }];
assert.equal(window.getUnifiedSectionStudents('Rizal').length, 2, 'Section-wide roster supports subject page');
sections = [{ name: 'Rizal', subject: 'Computer Programming 1', students: [] }];
assert.equal(window.getUnifiedSectionStudents('Rizal').length, 0, 'Explicit empty roster stays empty');
console.log('PASS: submission roster resolves subject IDs/names, Next/Prev work, unrelated subjects and empty rosters remain isolated.');
