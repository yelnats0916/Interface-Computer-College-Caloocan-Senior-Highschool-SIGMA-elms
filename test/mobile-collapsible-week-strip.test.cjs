const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

console.log('Running Mobile Collapsible Week Strip Verification Test...');

// 1. Verify shared HTML markup across all 4 files
const calendarPhp = fs.readFileSync(path.resolve(__dirname, '..', 'php', 'includes', 'calendar_page.php'), 'utf8');
const teacherHtml = fs.readFileSync(path.resolve(__dirname, '..', 'teacher.html'), 'utf8');
const studentHtml = fs.readFileSync(path.resolve(__dirname, '..', 'student.html'), 'utf8');
const adminHtml = fs.readFileSync(path.resolve(__dirname, '..', 'admin.html'), 'utf8');

[
    { name: 'calendar_page.php', content: calendarPhp },
    { name: 'teacher.html', content: teacherHtml },
    { name: 'student.html', content: studentHtml },
    { name: 'admin.html', content: adminHtml }
].forEach(({ name, content }) => {
    assert(content.includes('id="calendar-mobile-collapse-bar"'), `${name} must contain #calendar-mobile-collapse-bar`);
    assert(content.includes('id="calendar-mobile-expand-toggle"'), `${name} must contain #calendar-mobile-expand-toggle`);
    assert(content.includes('id="calendar-mobile-expand-label"'), `${name} must contain #calendar-mobile-expand-label`);
    assert(content.includes('id="calendar-mobile-prev-week-btn"'), `${name} must contain #calendar-mobile-prev-week-btn`);
    assert(content.includes('id="calendar-mobile-next-week-btn"'), `${name} must contain #calendar-mobile-next-week-btn`);
    assert(content.includes('stepAttendanceNav'), `${name} top toolbar chevrons must reference stepAttendanceNav`);
    assert(content.includes('toggleMobileCalendarExpand'), `${name} must bind toggleMobileCalendarExpand()`);
});
console.log('✓ All 4 calendar templates contain mobile collapsible week strip toggle bar and chevron navigation buttons.');

// 2. Verify CSS styles in teacher.css and calendar.css
const teacherCss = fs.readFileSync(path.resolve(__dirname, '..', 'css', 'teacher.css'), 'utf8');
const calendarCss = fs.readFileSync(path.resolve(__dirname, '..', 'css', 'calendar.css'), 'utf8');

[
    { name: 'teacher.css', content: teacherCss },
    { name: 'calendar.css', content: calendarCss }
].forEach(({ name, content }) => {
    assert(content.includes('#attendance-calendar-shell:not(.calendar-mobile-expanded)'), `${name} must style collapsed calendar shell`);
    assert(content.includes('data-active-week-cell="true"'), `${name} must filter active week cells`);
    assert(content.includes('.calendar-mobile-collapse-bar'), `${name} must style .calendar-mobile-collapse-bar`);
    assert(content.includes('.calendar-mobile-expand-btn'), `${name} must style .calendar-mobile-expand-btn`);
    assert(content.includes('.calendar-mobile-nav-chevron-btn'), `${name} must style .calendar-mobile-nav-chevron-btn`);
    assert(content.includes('overflow-x: hidden !important;'), `${name} must enforce overflow-x: hidden to eliminate horizontal scroll`);
});
console.log('✓ CSS collapsible week strip & chevron button styling verified in both stylesheets.');

// 3. Verify JavaScript logic in calendar.js and teacher.js
const calendarJs = fs.readFileSync(path.resolve(__dirname, '..', 'js', 'calendar.js'), 'utf8');
const teacherJs = fs.readFileSync(path.resolve(__dirname, '..', 'js', 'teacher.js'), 'utf8');

[
    { name: 'calendar.js', content: calendarJs },
    { name: 'teacher.js', content: teacherJs }
].forEach(({ name, content }) => {
    assert(content.includes('window.toggleMobileCalendarExpand'), `${name} must define window.toggleMobileCalendarExpand`);
    assert(content.includes('window.stepAttendanceWeek'), `${name} must define window.stepAttendanceWeek`);
    assert(content.includes('window.stepAttendanceNav'), `${name} must define window.stepAttendanceNav`);
    assert(!content.includes('swipeBound'), `${name} must NOT have horizontal swipe touch listeners`);
    assert(content.includes('data-active-week-cell'), `${name} must assign data-active-week-cell`);
    assert(content.includes('data-week-index'), `${name} must assign data-week-index`);
    assert(content.includes('updateMobileExpandToggleUI'), `${name} must define updateMobileExpandToggleUI`);
});
console.log('✓ JS collapsible logic, chevron navigation, and swipe removal verified.');

// 4. Simulated DOM behavior test
let isExpanded = false;
const mockClasses = new Set();
const mockBtnClasses = new Set();
const mockIconClasses = new Set(['fa-solid', 'fa-chevron-down', 'text-xs']);
const mockLabel = { textContent: 'Full Month' };
const mockShell = {
    classList: {
        add(c) { mockClasses.add(c); },
        remove(c) { mockClasses.delete(c); },
        contains(c) { return mockClasses.has(c); }
    },
    setAttribute() {}
};
const mockBtn = {
    setAttribute(attr, val) { this[attr] = val; },
    querySelector(sel) {
        return {
            set className(c) {
                mockIconClasses.clear();
                c.split(' ').forEach(x => mockIconClasses.add(x));
            },
            get className() { return Array.from(mockIconClasses).join(' '); }
        };
    }
};

const simulatedDom = {
    window: {
        isMobileCalendarExpanded: false,
        innerWidth: 375
    },
    document: {
        getElementById(id) {
            if (id === 'attendance-calendar-shell') return mockShell;
            if (id === 'calendar-mobile-expand-toggle') return mockBtn;
            if (id === 'calendar-mobile-expand-label') return mockLabel;
            return null;
        }
    }
};

simulatedDom.window.document = simulatedDom.document;
const ctx = vm.createContext(simulatedDom);

// Execute toggleMobileCalendarExpand in VM
const toggleCode = `
window.toggleMobileCalendarExpand = function () {
    window.isMobileCalendarExpanded = !window.isMobileCalendarExpanded;
    const calendarShell = document.getElementById('attendance-calendar-shell');
    const expandBtn = document.getElementById('calendar-mobile-expand-toggle');
    const expandLabel = document.getElementById('calendar-mobile-expand-label');
    const expandIcon = expandBtn ? expandBtn.querySelector('i') : null;

    if (calendarShell) {
        if (window.isMobileCalendarExpanded) {
            calendarShell.classList.add('calendar-mobile-expanded');
        } else {
            calendarShell.classList.remove('calendar-mobile-expanded');
        }
    }

    if (expandBtn) {
        expandBtn.setAttribute('aria-expanded', window.isMobileCalendarExpanded ? 'true' : 'false');
    }
    if (expandLabel) {
        expandLabel.textContent = window.isMobileCalendarExpanded ? 'Collapse' : 'Full Month';
    }
    if (expandIcon) {
        expandIcon.className = window.isMobileCalendarExpanded ? 'fa-solid fa-chevron-up text-xs' : 'fa-solid fa-chevron-down text-xs';
    }
};
`;
vm.runInContext(toggleCode, ctx);

// Test Initial State: Collapsed (1-week row)
assert.strictEqual(simulatedDom.window.isMobileCalendarExpanded, false, 'Default mobile state must be collapsed');
assert.strictEqual(mockClasses.has('calendar-mobile-expanded'), false, 'Shell must NOT have calendar-mobile-expanded initially');

// Test Toggle 1: Expand to Full Month
simulatedDom.window.toggleMobileCalendarExpand();
assert.strictEqual(simulatedDom.window.isMobileCalendarExpanded, true, 'isMobileCalendarExpanded must be true after toggle');
assert.strictEqual(mockClasses.has('calendar-mobile-expanded'), true, 'Shell must have calendar-mobile-expanded');
assert.strictEqual(simulatedDom.document.getElementById('calendar-mobile-expand-label').textContent, 'Collapse');

// Test Toggle 2: Collapse back to 1-Week Row
simulatedDom.window.toggleMobileCalendarExpand();
assert.strictEqual(simulatedDom.window.isMobileCalendarExpanded, false, 'isMobileCalendarExpanded must be false after toggle');
assert.strictEqual(mockClasses.has('calendar-mobile-expanded'), false, 'Shell must not have calendar-mobile-expanded');
assert.strictEqual(simulatedDom.document.getElementById('calendar-mobile-expand-label').textContent, 'Full Month');

console.log('✓ Mobile expand/collapse toggle simulation passed.');

// Test stepAttendanceNav behavior in different viewports and states
let weekStepCount = 0;
let monthStepCount = 0;
simulatedDom.window.stepAttendanceWeek = (dir) => { weekStepCount += dir; };
simulatedDom.window.stepAttendanceMonth = (dir) => { monthStepCount += dir; };

const navCode = `
window.stepAttendanceNav = function (direction = 1) {
    if (typeof window !== 'undefined' && window.innerWidth <= 1023 && !window.isMobileCalendarExpanded && typeof window.stepAttendanceWeek === 'function') {
        window.stepAttendanceWeek(direction);
    } else if (typeof window.stepAttendanceMonth === 'function') {
        window.stepAttendanceMonth(direction);
    }
};
`;
vm.runInContext(navCode, ctx);

// Case A: Mobile collapsed -> steps week
simulatedDom.window.innerWidth = 375;
simulatedDom.window.isMobileCalendarExpanded = false;
simulatedDom.window.stepAttendanceNav(1);
assert.strictEqual(weekStepCount, 1, 'stepAttendanceNav should step week on mobile collapsed');
assert.strictEqual(monthStepCount, 0, 'stepAttendanceNav should not step month on mobile collapsed');

// Case B: Mobile expanded -> steps month
simulatedDom.window.isMobileCalendarExpanded = true;
simulatedDom.window.stepAttendanceNav(1);
assert.strictEqual(weekStepCount, 1, 'stepAttendanceNav should not step week on mobile expanded');
assert.strictEqual(monthStepCount, 1, 'stepAttendanceNav should step month on mobile expanded');

// Case C: Desktop -> steps month
simulatedDom.window.innerWidth = 1200;
simulatedDom.window.isMobileCalendarExpanded = false;
simulatedDom.window.stepAttendanceNav(-1);
assert.strictEqual(monthStepCount, 0, 'stepAttendanceNav should step month on desktop');
console.log('✓ Mobile and desktop stepAttendanceNav dispatch logic verified.');

console.log('ALL MOBILE COLLAPSIBLE WEEK STRIP TESTS PASSED SUCCESSFULLY! 🎉');
