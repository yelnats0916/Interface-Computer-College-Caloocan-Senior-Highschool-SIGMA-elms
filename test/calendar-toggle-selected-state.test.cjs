const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

console.log('Running Calendar Toggle Selected State Real DOM Verification Test...');

const topbarJsPath = path.resolve(__dirname, '..', 'js', 'topbar.js');
const topbarJs = fs.readFileSync(topbarJsPath, 'utf8');

// 1. Verify CSS styles for calendar toggle active states
const topbarCss = fs.readFileSync(path.resolve(__dirname, '..', 'css', 'topbar.css'), 'utf8');
const calendarCss = fs.readFileSync(path.resolve(__dirname, '..', 'css', 'calendar.css'), 'utf8');

assert(topbarCss.includes('#calendar-toggle.active'), 'topbar.css must style #calendar-toggle.active');
assert(topbarCss.includes('body.calendar-page-mode #calendar-toggle'), 'topbar.css must style body.calendar-page-mode #calendar-toggle');
assert(calendarCss.includes('#calendar-toggle.active'), 'calendar.css must style #calendar-toggle.active');
assert(calendarCss.includes('body.calendar-page-mode #calendar-toggle'), 'calendar.css must style body.calendar-page-mode #calendar-toggle');

// 2. Test isActuallyCalendarPage against Teacher portal HTML structure
// In teacher.html:
// <section id="section-attendance" class="dynamic-section"> (visible on calendar page)
// <section id="section-classroom-detail" class="dynamic-section hidden">
//    <div id="classroom-detail-view" class="classroom-detail-shell"> (inner div WITHOUT hidden class)
// Previously, document.querySelector('#classroom-detail-view:not(.hidden)') matched this div and returned false.
// With section#classroom-detail-view:not(.hidden), this inner div is NOT matched.

function createTestEnvironment(activeSection, hash) {
    const classListMap = new Map();
    function getClassList(id) {
        if (!classListMap.has(id)) {
            const set = new Set();
            classListMap.set(id, {
                _set: set,
                contains: (c) => set.has(c),
                add: (...cs) => cs.forEach(c => set.add(c)),
                remove: (...cs) => cs.forEach(c => set.delete(c))
            });
        }
        return classListMap.get(id);
    }

    const bodyClassList = {
        _set: new Set(activeSection === 'section-attendance' ? ['calendar-page-mode'] : []),
        contains: (c) => bodyClassList._set.has(c),
        add: (...cs) => cs.forEach(c => bodyClassList._set.add(c)),
        remove: (...cs) => cs.forEach(c => bodyClassList._set.delete(c))
    };

    const simulatedDom = {
        document: {
            body: { classList: bodyClassList },
            getElementById(id) {
                if (id === 'calendar-toggle') {
                    return { classList: getClassList('calendar-toggle') };
                }
                if (id === 'mobile-subbar-calendar') {
                    return { classList: getClassList('mobile-subbar-calendar') };
                }
                if (id === 'mobile-appbar-calendar') {
                    return { classList: getClassList('mobile-appbar-calendar') };
                }
                if (id === 'calendar-dropdown') {
                    return { classList: { contains: (c) => c === 'hidden' } };
                }
                if (id === 'section-attendance') {
                    return {
                        id: 'section-attendance',
                        classList: {
                            contains: (c) => c === 'hidden' ? activeSection !== 'section-attendance' : false
                        }
                    };
                }
                return null;
            },
            querySelector(sel) {
                // If checking for other visible sections:
                // Notice that #classroom-detail-view in teacher.html is a DIV, so section#classroom-detail-view does not match it!
                if (sel.includes('section#classroom-detail-view:not(.hidden)')) {
                    return activeSection === 'classroom-detail-view' ? { tagName: 'SECTION', id: 'classroom-detail-view' } : null;
                }
                if (sel.includes('#section-classroom-detail:not(.hidden)')) {
                    return activeSection === 'section-classroom-detail' ? { tagName: 'SECTION', id: 'section-classroom-detail' } : null;
                }
                if (sel.includes('#section-dashboard:not(.hidden)')) {
                    return activeSection === 'section-dashboard' ? { tagName: 'SECTION', id: 'section-dashboard' } : null;
                }
                if (sel.includes('#section-classes:not(.hidden)')) {
                    return activeSection === 'section-classes' ? { tagName: 'SECTION', id: 'section-classes' } : null;
                }
                return null;
            },
            querySelectorAll() { return []; },
            addEventListener() {}
        },
        window: {
            location: { hash: hash || '' },
            addEventListener() {}
        }
    };
    simulatedDom.window.document = simulatedDom.document;

    const ctx = vm.createContext(simulatedDom);
    const code = topbarJs.slice(topbarJs.indexOf('window.isActuallyCalendarPage = function'), topbarJs.indexOf('window.openAiPanel'));
    vm.runInContext(code, ctx);

    return { simulatedDom, getClassList };
}

// Test A: User on calendar page with hash #calendar
{
    const { simulatedDom, getClassList } = createTestEnvironment('section-attendance', '#calendar');
    assert.strictEqual(simulatedDom.window.isActuallyCalendarPage(), true, 'Must return true on #calendar route');
    simulatedDom.window.syncCalendarPageActiveState();
    assert.strictEqual(getClassList('calendar-toggle').contains('active'), true, '#calendar-toggle must be active on #calendar');
    assert.strictEqual(simulatedDom.document.body.classList.contains('calendar-page-mode'), true, 'calendar-page-mode must be on body');
}

// Test B: User on calendar page without hash (hash = '')
{
    const { simulatedDom, getClassList } = createTestEnvironment('section-attendance', '');
    assert.strictEqual(simulatedDom.window.isActuallyCalendarPage(), true, 'Must return true on calendar section even without hash');
    simulatedDom.window.syncCalendarPageActiveState();
    assert.strictEqual(getClassList('calendar-toggle').contains('active'), true, '#calendar-toggle must be active on calendar section');
    assert.strictEqual(simulatedDom.document.body.classList.contains('calendar-page-mode'), true, 'calendar-page-mode must be on body');
}

// Test C: User on dashboard (hash = '#dashboard')
{
    const { simulatedDom, getClassList } = createTestEnvironment('section-dashboard', '#dashboard');
    assert.strictEqual(simulatedDom.window.isActuallyCalendarPage(), false, 'Must return false on dashboard route');
    simulatedDom.window.syncCalendarPageActiveState();
    assert.strictEqual(getClassList('calendar-toggle').contains('active'), false, '#calendar-toggle must NOT be active on dashboard');
    assert.strictEqual(simulatedDom.document.body.classList.contains('calendar-page-mode'), false, 'calendar-page-mode must NOT be on body');
}

// Test D: User on classroom detail section
{
    const { simulatedDom, getClassList } = createTestEnvironment('section-classroom-detail', '#classroom:Rizal:Computer%20Programming%201:topics');
    assert.strictEqual(simulatedDom.window.isActuallyCalendarPage(), false, 'Must return false on classroom route');
    simulatedDom.window.syncCalendarPageActiveState();
    assert.strictEqual(getClassList('calendar-toggle').contains('active'), false, '#calendar-toggle must NOT be active on classroom route');
    assert.strictEqual(simulatedDom.document.body.classList.contains('calendar-page-mode'), false, 'calendar-page-mode must NOT be on body');
}

console.log('✓ All Calendar Toggle Selected State Real DOM tests passed! 🎉');
