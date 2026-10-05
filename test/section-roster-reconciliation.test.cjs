const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const adminSource = fs.readFileSync(path.join(root, 'js', 'admin.js'), 'utf8');
const syncStart = adminSource.indexOf('window.syncAllSectionsWithUsers = function () {');
const syncEnd = adminSource.indexOf('// Auto-run sync on admin load', syncStart);
assert.notEqual(syncStart, -1, 'Section-account synchronizer must exist');
assert.notEqual(syncEnd, -1, 'Section-account synchronizer end marker must exist');

const store = new Map([
    ['sigma-admin-sections', [
        {
            id: 'rizal-id',
            name: 'Rizal',
            gradeLevel: 'Grade 11',
            subject: 'Computer Programming 1',
            teachers: JSON.stringify([{ id: 'maria-id', name: 'Maria Santos Ramos' }]),
            students: JSON.stringify([{ id: 'student-one', name: 'Alex Rivera' }])
        },
        {
            id: 'einstein-id',
            name: 'Einstein',
            gradeLevel: 'Grade 11',
            subject: 'Computer Programming 1',
            teachers: [{ id: 'ana-id', name: 'Ana Villanueva Bautista' }],
            assignedTeachers: [{ id: 'maria-id', name: 'Maria Santos Ramos' }],
            students: [{ id: 'student-two', name: 'Jordan Cruz' }],
            assignedStudents: [{ id: 'student-one', name: 'Alex Rivera' }]
        }
    ]],
    ['sigma-admin-users', [
        {
            id: 'maria-id', uid: 'maria-id', name: 'Maria Santos Ramos', fullName: 'Maria Santos Ramos',
            email: 'maria@example.test', role: 'Teacher', sections: ['einstein-id'],
            assignedSections: ['einstein-id'], subjects: ['Computer Programming 1'],
            assignedSubjects: ['Computer Programming 1']
        },
        {
            id: 'ana-id', uid: 'ana-id', name: 'Ana Villanueva Bautista', fullName: 'Ana Villanueva Bautista',
            email: 'ana@example.test', role: 'Teacher', sections: ['rizal-id'], assignedSections: ['rizal-id']
        },
        {
            id: 'student-one', uid: 'student-one', name: 'Alex Rivera', fullName: 'Alex Rivera',
            role: 'Student', sections: ['einstein-id'], assignedSections: ['einstein-id'],
            subjects: ['Old Subject'], enrolledSubjects: ['Old Subject']
        },
        {
            id: 'student-two', uid: 'student-two', name: 'Jordan Cruz', fullName: 'Jordan Cruz',
            role: 'Student', sections: ['rizal-id'], assignedSections: ['rizal-id']
        }
    ]]
]);
const getStoredJson = (key, fallback) => store.has(key) ? store.get(key) : fallback;
const saveStoredJson = (key, value) => store.set(key, JSON.parse(JSON.stringify(value)));
const adminWindow = {};
const adminContext = vm.createContext({
    window: adminWindow,
    SECTIONS_STORAGE_KEY: 'sigma-admin-sections',
    getStoredJson,
    saveStoredJson,
    console
});
vm.runInContext(adminSource.slice(syncStart, syncEnd), adminContext);
adminWindow.syncAllSectionsWithUsers();

const users = store.get('sigma-admin-users');
const byId = id => users.find(user => user.id === id);
assert.deepEqual(Array.from(byId('maria-id').sections), ['rizal-id', 'Rizal']);
assert.deepEqual(Array.from(byId('ana-id').sections), ['einstein-id', 'Einstein']);
assert.deepEqual(Array.from(byId('student-one').sections), ['rizal-id', 'Rizal']);
assert.deepEqual(Array.from(byId('student-one').subjects), ['Computer Programming 1']);
assert.deepEqual(Array.from(byId('student-two').sections), ['einstein-id', 'Einstein']);
assert.equal(byId('student-one').section, 'Rizal');
assert.equal(byId('student-two').section, 'Einstein');

const sharedSource = fs.readFileSync(path.join(root, 'js', 'shared-components.js'), 'utf8');
const rosterStart = sharedSource.indexOf('window.getUnifiedSectionStudents = function (sectionName, subjectName) {');
const rosterEnd = sharedSource.indexOf('window.isUserNameMatch = function', rosterStart);
assert.notEqual(rosterStart, -1, 'Shared section-roster resolver must exist');
assert.notEqual(rosterEnd, -1, 'Shared section-roster resolver end marker must exist');
const sharedWindow = {
    getStoredJson,
    formatStudentLastFirstMiddle: student => student.name || student.fullName || '',
    resolveUserAvatar: () => ''
};
const sharedContext = vm.createContext({
    window: sharedWindow,
    currentTopicState: {},
    DEFAULT_SECTION_STUDENTS: [{ name: 'Unassigned Sample' }]
});
vm.runInContext(sharedSource.slice(rosterStart, rosterEnd), sharedContext);
assert.deepEqual(
    Array.from(sharedWindow.getUnifiedSectionStudents('Grade 11 - Rizal', 'Computer Programming 1'), student => student.id),
    ['student-one'],
    'Members roster must return only students assigned to the exact section and subject'
);
assert.deepEqual(
    Array.from(sharedWindow.getUnifiedSectionStudents('Rizal', 'Different Subject')),
    [],
    'An unrelated subject must not fall through to user records or sample students'
);
store.set('sigma-admin-sections', [{ id: 'empty-id', name: 'Empty', subject: 'Computer Programming 1', students: [] }]);
assert.deepEqual(
    Array.from(sharedWindow.getUnifiedSectionStudents('Empty', 'Computer Programming 1')),
    [],
    'An intentionally empty section roster must remain empty'
);

console.log('PASS: section teacher and student assignments reconcile from canonical rosters');
