const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const teacherSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'teacher.js'), 'utf8');
const tabSessionSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'tab-session.js'), 'utf8');
const sharedComponentsSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'shared-components.js'), 'utf8');

test('teacher portal defaults to Maria Santos Ramos (1111111) when opened fresh with no teacher logged in', () => {
    const mockStorage = {};
    const mockSession = {};

    const context = vm.createContext({
        window: {
            location: { pathname: '/teacher.html' },
            addEventListener: () => {}
        },
        document: {
            body: { id: 'teacher-dashboard-page', classList: { contains: () => true } },
            addEventListener: () => {}
        },
        localStorage: {
            getItem: k => mockStorage[k] || null,
            setItem: (k, v) => { mockStorage[k] = v; },
            removeItem: k => { delete mockStorage[k]; }
        },
        sessionStorage: {
            getItem: k => mockSession[k] || null,
            setItem: (k, v) => { mockSession[k] = v; },
            removeItem: k => { delete mockSession[k]; }
        },
        getStoredJson: (k, fallback) => {
            const val = mockStorage[k];
            return val ? JSON.parse(val) : fallback;
        },
        console: { log: () => {}, warn: () => {}, error: () => {} }
    });

    vm.runInContext(tabSessionSource, context);
    const sessionUser = context.window.getTabSessionUser();
    assert.equal(sessionUser.id, '1111111', 'tab-session must default to Maria Santos Ramos when no account is logged in');
    assert.equal(sessionUser.fullName, 'Maria Santos Ramos');
    assert.deepEqual(Array.from(sessionUser.assignedSections || []), [], 'Fresh session must have no fake assigned sections');
    assert.deepEqual(Array.from(sessionUser.assignedSubjects || []), [], 'Fresh session must have no fake assigned subjects');
});

test('each teacher logs in to their own account and does NOT become Maria Ramos', () => {
    const anaUser = {
        id: '26010214',
        uid: '26010214',
        firstName: 'Ana',
        lastName: 'Bautista',
        fullName: 'Ana Villanueva Bautista',
        role: 'Teacher',
        section: 'Einstein',
        subject: 'Computer Programming 1'
    };
    const mockStorage = {
        'sigma-admin-users': JSON.stringify([anaUser])
    };
    const mockSession = {
        'sigma-authenticated-user': JSON.stringify(anaUser)
    };

    const context = vm.createContext({
        window: {
            location: { pathname: '/teacher.html' },
            addEventListener: () => {}
        },
        document: {
            body: { id: 'teacher-dashboard-page', classList: { contains: () => true } },
            addEventListener: () => {}
        },
        localStorage: {
            getItem: k => mockStorage[k] || null,
            setItem: (k, v) => { mockStorage[k] = v; }
        },
        sessionStorage: {
            getItem: k => mockSession[k] || null,
            setItem: (k, v) => { mockSession[k] = v; }
        },
        USER_STORAGE_KEY: 'sigma-admin-users',
        getStoredJson: (k, fb) => {
            const val = mockStorage[k];
            return val ? JSON.parse(val) : fb;
        },
        console: { log: () => {}, warn: () => {}, error: () => {} }
    });

    const resolverSnippet = teacherSource.slice(
        teacherSource.indexOf('    function getLoggedInTeacherUser() {'),
        teacherSource.indexOf('    window.getLoggedInTeacherUser = getLoggedInTeacherUser;') + '    window.getLoggedInTeacherUser = getLoggedInTeacherUser;'.length
    );
    vm.runInContext(resolverSnippet, context);

    const loggedIn = context.window.getLoggedInTeacherUser();
    assert.equal(loggedIn.id, '26010214', 'Ana Bautista ID must remain 26010214');
    assert.equal(loggedIn.fullName, 'Ana Villanueva Bautista', 'Ana Bautista name must NOT become Maria Ramos');
});

test('shared-components getLoggedInTeacherUser preserves logged in teacher account', () => {
    const joseUser = {
        id: '26010213',
        uid: '26010213',
        firstName: 'Jose',
        lastName: 'Dela Pena',
        fullName: 'Jose Cruz Dela Pena',
        role: 'Teacher'
    };
    const mockStorage = {
        'sigma-admin-users': JSON.stringify([joseUser])
    };
    const mockSession = {
        'sigma-authenticated-user': JSON.stringify(joseUser)
    };

    const context = vm.createContext({
        window: {
            location: { pathname: '/teacher.html' },
            addEventListener: () => {}
        },
        document: {
            body: { id: 'teacher-dashboard-page', classList: { contains: () => true } },
            addEventListener: () => {}
        },
        localStorage: {
            getItem: k => mockStorage[k] || null,
            setItem: (k, v) => { mockStorage[k] = v; }
        },
        sessionStorage: {
            getItem: k => mockSession[k] || null,
            setItem: (k, v) => { mockSession[k] = v; }
        },
        console: { log: () => {}, warn: () => {}, error: () => {} }
    });

    const getTeacherSnippet = sharedComponentsSource.slice(
        sharedComponentsSource.indexOf('window.getLoggedInTeacherUser = function () {'),
        sharedComponentsSource.indexOf('window.getQuizActiveUser = function')
    );
    vm.runInContext(getTeacherSnippet, context);

    const teacher = context.window.getLoggedInTeacherUser();
    assert.equal(teacher.id, '26010213', 'Jose Dela Pena ID must be 26010213');
    assert.equal(teacher.fullName, 'Jose Cruz Dela Pena', 'Jose Dela Pena must NOT become Maria Ramos');
});

test('teacher.js getTeacherSectionCards returns empty on fresh storage and loads real sections when configured', () => {
    const mockStorage = {};
    const mockSession = {};

    const context = vm.createContext({
        window: {
            location: { pathname: '/teacher.html' },
            addEventListener: () => {}
        },
        document: {
            body: { id: 'teacher-dashboard-page', classList: { contains: () => true } },
            addEventListener: () => {}
        },
        localStorage: {
            getItem: k => mockStorage[k] || null,
            setItem: (k, v) => { mockStorage[k] = v; }
        },
        sessionStorage: {
            getItem: k => mockSession[k] || null,
            setItem: (k, v) => { mockSession[k] = v; }
        },
        USER_STORAGE_KEY: 'sigma-admin-users',
        getStoredJson: (k, fb) => (mockStorage[k] ? JSON.parse(mockStorage[k]) : fb),
        console: { log: () => {}, warn: () => {}, error: () => {} }
    });

    const resolverSnippet = teacherSource.slice(
        teacherSource.indexOf('    function getLoggedInTeacherUser() {'),
        teacherSource.indexOf('    window.getLoggedInTeacherUser = getLoggedInTeacherUser;') + '    window.getLoggedInTeacherUser = getLoggedInTeacherUser;'.length
    );
    vm.runInContext(resolverSnippet, context);

    const isSectionAssignedSnippet = teacherSource.slice(
        teacherSource.indexOf('    function isSectionAssignedToTeacher(sec, teacher) {'),
        teacherSource.indexOf('    function getTeacherSectionCards(forceRefresh = false) {')
    );
    vm.runInContext(isSectionAssignedSnippet, context);

    const cardsSnippet = teacherSource.slice(
        teacherSource.indexOf('    function getTeacherSectionCards(forceRefresh = false) {'),
        teacherSource.indexOf('    window.getTeacherSectionCards = getTeacherSectionCards;') + '    window.getTeacherSectionCards = getTeacherSectionCards;'.length
    );
    vm.runInContext('var _cachedTeacherSectionCards = null; var _cachedTeacherSectionCardsOwner = null; var _cachedTeacherSectionCardsTime = 0;\n' + cardsSnippet, context);

    // Fresh storage: no sections or subjects configured
    const freshCards = context.window.getTeacherSectionCards(true);
    assert.equal(freshCards.length, 0, 'Fresh browser must have 0 cards (no fake subjects or sections)');

    // When admin creates a section in storage
    mockStorage['sigma-admin-sections'] = JSON.stringify([
        {
            id: 'sec-1',
            name: 'Rizal',
            subject: 'Empowerment Technologies',
            grade: 'Grade 11',
            room: 'Room 302',
            teachers: [{ id: '1111111', name: 'Maria Santos Ramos' }]
        }
    ]);
    const configuredCards = context.window.getTeacherSectionCards(true);
    assert.equal(configuredCards.length, 1, 'Configured browser must return the real assigned section');
    assert.equal(configuredCards[0].subject, 'Empowerment Technologies');
    assert.equal(configuredCards[0].sectionName, 'Rizal');
});
