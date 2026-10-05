const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'teacher.js'), 'utf8');
const assignmentStart = source.indexOf('    function isSectionAssignedToTeacher(sec, teacher) {');
const assignmentMarker = '    window.isSectionAssignedToTeacher = isSectionAssignedToTeacher;';
const assignmentEnd = source.indexOf(assignmentMarker, assignmentStart);
assert.notEqual(assignmentStart, -1, 'Canonical section teacher matcher must exist');
assert.notEqual(assignmentEnd, -1, 'Canonical section teacher matcher export must exist');
const assignmentWindow = {};
vm.runInContext(
    source.slice(assignmentStart, assignmentEnd + assignmentMarker.length),
    vm.createContext({ window: assignmentWindow })
);
const mariaIdentity = { id: '1111111', uid: '1111111', fullName: 'Maria Santos Ramos' };
const anaIdentity = { id: '26010214', uid: '26010214', fullName: 'Ana Bautista' };
assert.equal(assignmentWindow.isSectionAssignedToTeacher({
    name: 'Einstein',
    teachers: [{ id: '26010214', name: 'Ana Bautista' }],
    assignedTeachers: [{ id: '1111111', name: 'Maria Santos Ramos' }]
}, mariaIdentity), false, 'Stale secondary teacher entries must not authorize Maria for Ana’s Einstein section');
assert.equal(assignmentWindow.isSectionAssignedToTeacher({
    name: 'Einstein',
    teachers: [{ id: '26010214', name: 'Ana Bautista' }],
    assignedTeachers: [{ id: '1111111', name: 'Maria Santos Ramos' }]
}, anaIdentity), true, 'The canonical Einstein teacher remains assigned');
assert.equal(assignmentWindow.isSectionAssignedToTeacher({
    name: 'Unassigned',
    teachers: [],
    assignedTeachers: [{ id: '1111111', name: 'Maria Santos Ramos' }]
}, mariaIdentity), false, 'An intentionally empty canonical teacher roster stays unassigned');

const start = source.indexOf('    function normalizeRoomSectionToken(value) {');
const endMarker = '    window.resolveTeacherRoomRoute = resolveTeacherRoomRoute;';
const end = source.indexOf(endMarker, start);
assert.notEqual(start, -1, 'Room assignment logic must exist');
assert.notEqual(end, -1, 'Room route resolver must exist');

const teacher = {
    id: '1111111',
    uid: '1111111',
    firstName: 'Maria',
    middleName: 'Santos',
    lastName: 'Ramos',
    fullName: 'Maria Santos Ramos'
};
const recordsByKey = new Map();
const window = {
    isSectionAssignedToTeacher: (section, currentTeacher) => (section.teachers || []).some(item =>
        String(item.id || item.uid || '').toLowerCase() === String(currentTeacher.id || '').toLowerCase()
        || String(item.name || item.fullName || '').toLowerCase() === String(currentTeacher.fullName || '').toLowerCase())
};
const context = vm.createContext({
    window,
    getLoggedInTeacherUser: () => teacher,
    getStoredJson: key => recordsByKey.get(key) || []
});
vm.runInContext(source.slice(start, end + endMarker.length), context);

recordsByKey.set('sigma-admin-sections', [
    { id: 'einstein', name: 'Einstein', subject: 'Computer Programming 1', teachers: [{ id: 'ana', name: 'Ana Villanueva Bautista' }] },
    { id: 'rizal', name: 'Rizal', subject: 'Computer Programming 1', teachers: [{ id: '1111111', name: 'Maria Santos Ramos' }] }
]);
recordsByKey.set('sigma-sections-list', [
    { id: 'einstein', name: 'Einstein', subject: 'Computer Programming 1', teachers: [{ id: '1111111', name: 'Maria Santos Ramos' }] }
]);

const accountStart = source.indexOf('    function getLoggedInTeacherUser() {');
const accountMarker = '    window.getLoggedInTeacherUser = getLoggedInTeacherUser;';
const accountEnd = source.indexOf(accountMarker, accountStart);
assert.notEqual(accountStart, -1, 'Teacher account resolver must exist');
assert.notEqual(accountEnd, -1, 'Teacher account resolver export must exist');
const accountUsers = [
    {
        id: '1111111',
        uid: '1111111',
        firstName: 'Maria',
        middleName: 'Santos',
        lastName: 'Ramos',
        fullName: 'Maria Santos Ramos',
        email: 'maria.ramos@example.test',
        role: 'Teacher',
        assignedSections: ['einstein'],
        sections: ['einstein'],
        assignedSubjects: ['Computer Programming 1']
    },
    {
        id: 'ana-id',
        uid: 'ana-id',
        firstName: 'Ana',
        lastName: 'Bautista',
        fullName: 'Ana Villanueva Bautista',
        email: 'ana@example.test',
        role: 'Teacher',
        assignedSections: ['einstein'],
        assignedSubjects: ['Computer Programming 1']
    }
];
const accountWindow = {};
const accountContext = vm.createContext({
    window: accountWindow,
    USER_STORAGE_KEY: 'sigma-admin-users',
    localStorage: {
        getItem: key => key === 'sigma-admin-users' ? JSON.stringify(accountUsers) : null
    },
    sessionStorage: {
        getItem: key => key === 'sigma-authenticated-user'
            ? JSON.stringify({ id: '1111111', fullName: 'Maria Santos Ramos', assignedSections: ['einstein'] })
            : null
    },
    getStoredJson: (key, fallback) => recordsByKey.has(key) ? recordsByKey.get(key) : fallback,
    isSectionAssignedToTeacher: (section, currentTeacher) => (section.teachers || []).some(item =>
        String(item.id || item.uid || '').toLowerCase() === String(currentTeacher.id || '').toLowerCase())
});
vm.runInContext(source.slice(accountStart, accountEnd + accountMarker.length), accountContext);
const resolvedAccount = accountWindow.getLoggedInTeacherUser();
assert.deepEqual(Array.from(resolvedAccount.assignedSections), ['rizal', 'Rizal'],
    'Maria’s account assignments must come from her canonical section roster, not stale profile copies');
assert.deepEqual(Array.from(resolvedAccount.assignedSubjects), ['Computer Programming 1'],
    'Maria must not inherit another teacher’s assignments through stale or merged account data');

assert.equal(window.isTeacherStrictlyAssignedToRoom('Einstein', 'Computer Programming 1'), false,
    'A stale section copy must not grant a teacher access contrary to the canonical assignment');
assert.equal(window.isTeacherStrictlyAssignedToRoom('Rizal', 'Computer Programming 1'), true,
    'The teacher must retain access to their assigned section with the same subject');
const redirectedRoom = window.resolveTeacherRoomRoute('Einstein', 'Computer Programming 1');
assert.equal(redirectedRoom.sectionName, 'Rizal',
    'Opening another teacher’s same-subject section must route to the teacher’s assigned section');
assert.equal(redirectedRoom.subjectName, 'Computer Programming 1');
const assignedRoom = window.resolveTeacherRoomRoute('Rizal', 'Computer Programming 1');
assert.equal(assignedRoom.sectionName, 'Rizal', 'An authorized section must retain its own room route');
assert.equal(assignedRoom.subjectName, 'Computer Programming 1');

const cardsStart = source.indexOf('    function getTeacherSectionCards(forceRefresh = false) {');
const cardsMarker = '    window.getTeacherSectionCards = getTeacherSectionCards;';
const cardsEnd = source.indexOf(cardsMarker, cardsStart);
assert.notEqual(cardsStart, -1, 'Teacher section cards must exist');
assert.notEqual(cardsEnd, -1, 'Teacher section cards export must exist');

const canonicalSections = [
    { id: 'einstein', name: 'Einstein', subject: 'Computer Programming 1', teachers: [{ id: 'ana', name: 'Ana Villanueva Bautista' }] },
    { id: 'rizal', name: 'Rizal', subject: 'Computer Programming 1', teachers: [{ id: '1111111', name: 'Maria Santos Ramos' }] }
];
recordsByKey.set('sigma-admin-sections', canonicalSections);
recordsByKey.set('sigma-sections-list', [
    { id: 'einstein', name: 'Einstein', subject: 'Computer Programming 1', teachers: [{ id: '1111111', name: 'Maria Santos Ramos' }] }
]);
const cardsWindow = {
    getTeacherAssignedSubjectsAndSections: () => [{
        id: 'einstein',
        subject: 'Computer Programming 1',
        sectionName: 'Einstein'
    }]
};
const cardsContext = vm.createContext({
    window: cardsWindow,
    getStoredJson: (key, fallback) => recordsByKey.has(key) ? recordsByKey.get(key) : fallback,
    getLoggedInTeacherUser: () => teacher,
    isSectionAssignedToTeacher: (section, currentTeacher) => (section.teachers || []).some(item =>
        String(item.id || item.uid || '').toLowerCase() === String(currentTeacher.id || '').toLowerCase()),
    _cachedTeacherSectionCards: null,
    _cachedTeacherSectionCardsTime: 0
});
vm.runInContext(source.slice(cardsStart, cardsEnd + cardsMarker.length), cardsContext);
const teacherCards = cardsWindow.getTeacherSectionCards(true);
assert.equal(teacherCards.length, 1, 'Legacy assignment data must not duplicate or override the canonical section roster');
assert.equal(teacherCards[0].sectionName, 'Rizal',
    'Maria’s class list must show Rizal, not another teacher’s same-subject Einstein section');

recordsByKey.set('sigma-admin-sections', []);
assert.equal(window.isTeacherStrictlyAssignedToRoom('Einstein', 'Computer Programming 1'), true,
    'Legacy section data remains a fallback when no canonical section record exists');

// Verify default fallback cards for Maria Santos Ramos
recordsByKey.set('sigma-sections-list', []);
const mariaFallbackContext = vm.createContext({
    window: {
        getTeacherAssignedSubjectsAndSections: () => []
    },
    getStoredJson: (key, fallback) => recordsByKey.has(key) ? recordsByKey.get(key) : fallback,
    getLoggedInTeacherUser: () => teacher,
    isSectionAssignedToTeacher: () => false,
    _cachedTeacherSectionCards: null,
    _cachedTeacherSectionCardsTime: 0
});
vm.runInContext(source.slice(cardsStart, cardsEnd + cardsMarker.length), mariaFallbackContext);
const mariaCards = mariaFallbackContext.window.getTeacherSectionCards(true);
assert.equal(mariaCards.length, 0, 'Maria Ramos must have 0 cards when no sections or subjects are assigned in storage');

// Verify no fabricated fallback cards for Ana Bautista when unassigned
const anaTeacher = { id: '26010214', uid: '26010214', firstName: 'Ana', lastName: 'Bautista', fullName: 'Ana Villanueva Bautista' };
const anaFallbackContext = vm.createContext({
    window: {
        getTeacherAssignedSubjectsAndSections: () => []
    },
    getStoredJson: (key, fallback) => recordsByKey.has(key) ? recordsByKey.get(key) : fallback,
    getLoggedInTeacherUser: () => anaTeacher,
    isSectionAssignedToTeacher: () => false,
    _cachedTeacherSectionCards: null,
    _cachedTeacherSectionCardsTime: 0
});
vm.runInContext(source.slice(cardsStart, cardsEnd + cardsMarker.length), anaFallbackContext);
const anaCards = anaFallbackContext.window.getTeacherSectionCards(true);
assert.equal(anaCards.length, 0, 'Ana Bautista must have 0 cards when no sections are assigned in storage');
assert.ok(!anaCards.some(c => c.sectionName === 'Rizal'), 'Ana Bautista must not have any Rizal section assignments');

console.log('PASS: canonical teacher assignments isolate same-subject sections and legacy data remains a fallback');
