const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/notifications.js'), 'utf8');
for (const role of ['student', 'teacher']) {
    const callbacks = new Map();
    const windowEvents = new Map();
    const timers = [];
    const badge = () => ({ textContent: '', style: {}, hidden: true,
        classList: { toggle(name, hidden) { this.owner.hidden = hidden; } },
        parentElement: { setAttribute() {} } });
    const desktop = badge(); desktop.classList.owner = desktop;
    const mobile = badge(); mobile.classList.owner = mobile;
    const notification = { id: 'startup-scope', recipientId: 'owner', read: false,
        assignmentScope: { subjectId: 'programming', section: 'Rizal' } };
    const storage = new Map([
        [`sigma-notifications-${role}-v3`, JSON.stringify([notification, { ...notification, id: 'other', recipientId: 'other' }])],
        ['sigma-admin-sections', JSON.stringify([{ id: 'rizal', name: 'Rizal', subjectId: 'programming' }])]
    ]);
    const window = { addEventListener: (name, fn) => windowEvents.set(name, fn),
        matchMedia: () => ({ matches: false, addEventListener() {} }) };
    const document = { currentScript:{src:'https://sigma.test/js/notifications.js'}, readyState: 'loading',
        getElementById: id => id === `${role}-header` ? {} : id === 'noti-badge' ? desktop : id === 'mobile-noti-badge' ? mobile : null,
        querySelector: () => null,
        addEventListener: (name, fn) => callbacks.set(name, fn) };
    vm.runInNewContext(source, { URL, window, document, location: { pathname: `/${role}.html` },
        localStorage: { getItem: key => storage.get(key) || null },
        sessionStorage: { getItem: () => '{}' }, console, setTimeout: fn => timers.push(fn) });
    callbacks.get('DOMContentLoaded')();
    assert.equal(desktop.hidden, true, 'Scoped records stay hidden until identity is ready');
    if (role === 'student') {
        window.getLoggedInStudentUser = () => ({ id: 'owner' });
        window.isSectionAssignedToStudent = () => true;
    } else {
        window.getEffectiveTeacher = () => ({ id: 'owner' });
        window.getTeacherAssignedSubjectsAndSections = () => [{ subjectId: 'programming', sectionName: 'Rizal' }];
    }
    timers.forEach(fn => fn());
    for (const node of [desktop, mobile]) {
        assert.equal(node.textContent, '1');
        assert.equal(node.hidden, false, 'Unread badge appears without opening notifications');
    }
    storage.set(`sigma-notifications-${role}-v3`, JSON.stringify([{ ...notification, read: true }]));
    windowEvents.get('pageshow')();
    assert.equal(desktop.hidden, true, 'Restored pages recount unread records');
    storage.set(`sigma-notifications-${role}-v3`, JSON.stringify([notification]));
    windowEvents.get('notifications-updated')();
    assert.equal(mobile.hidden, false, 'Badges update even when a feed is not mounted');
}
console.log('Student/teacher badges initialize after scoped readers, remain recipient-safe, and refresh on page restoration');
