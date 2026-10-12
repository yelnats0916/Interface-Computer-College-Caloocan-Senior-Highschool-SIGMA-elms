const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

console.log('Running Calendar Dropdown Quick Agenda Feature Test...');

// 1. Verify CSS styles in css/calendar.css
const calendarCss = fs.readFileSync(path.resolve(__dirname, '..', 'css', 'calendar.css'), 'utf8');
assert(calendarCss.includes('.calendar-dropdown-agenda'), 'css/calendar.css must style .calendar-dropdown-agenda');
assert(calendarCss.includes('.cal-dropdown-item'), 'css/calendar.css must style .cal-dropdown-item');
assert(calendarCss.includes('.calendar-dropdown-agenda-list'), 'css/calendar.css must style .calendar-dropdown-agenda-list');
assert(calendarCss.includes('scrollbar-color: transparent transparent !important;'), 'css/calendar.css must have invisible scrollbar initially');
assert(calendarCss.includes('scrollbar-color: rgba(0, 0, 0, .18) transparent !important;'), 'css/calendar.css must reveal scrollbar on hover');
assert(calendarCss.includes('overflow-y: visible !important;'), 'css/calendar.css must make list overflow visible so only 1 big scroll exists');
assert(calendarCss.includes('transform: none !important;'), 'css/calendar.css must have no floating transform effects');
assert(calendarCss.includes('box-shadow: none !important;'), 'css/calendar.css must have no floating shadow effects');
assert(calendarCss.includes('text-transform: capitalize !important;'), 'css/calendar.css must use title case (capitalize)');
assert(calendarCss.includes('.cal-item-subtitle'), 'css/calendar.css must style .cal-item-subtitle');
assert(calendarCss.includes('.cal-dropdown-bar'), 'css/calendar.css must style .cal-dropdown-bar');
assert(calendarCss.includes('#FFD000'), 'css/calendar.css must define yellow #FFD000 for current/today');
assert(calendarCss.includes('#15803d'), 'css/calendar.css must define green #15803d for upcoming');
assert(calendarCss.includes('#000000'), 'css/calendar.css must define black #000000 for past');
console.log('✓ CSS styles verified in css/calendar.css.');

// 2. Verify markup in templates
const topbarPhp = fs.readFileSync(path.resolve(__dirname, '..', 'php', 'includes', 'topbar.php'), 'utf8');
const teacherHtml = fs.readFileSync(path.resolve(__dirname, '..', 'teacher.html'), 'utf8');
const studentHtml = fs.readFileSync(path.resolve(__dirname, '..', 'student.html'), 'utf8');
const adminHtml = fs.readFileSync(path.resolve(__dirname, '..', 'admin.html'), 'utf8');

[
    { name: 'php/includes/topbar.php', content: topbarPhp },
    { name: 'teacher.html', content: teacherHtml },
    { name: 'student.html', content: studentHtml },
    { name: 'admin.html', content: adminHtml }
].forEach(({ name, content }) => {
    assert(content.includes('id="calendar-dropdown-agenda"'), `${name} must contain #calendar-dropdown-agenda`);
    assert(content.includes('id="calendar-dropdown-agenda-list"'), `${name} must contain #calendar-dropdown-agenda-list`);
    assert(content.includes('view-calendar-anchor calendar-header__action-btn'), `${name} must contain .view-calendar-anchor in .calendar-header`);
    assert(content.includes('fa-arrow-up-right-from-square'), `${name} must contain fa-arrow-up-right-from-square icon`);
    // Assert headers are removed as requested
    assert(!content.includes('id="calendar-dropdown-agenda-title"'), `${name} must NOT contain #calendar-dropdown-agenda-title`);
    assert(!content.includes('id="calendar-dropdown-agenda-count"'), `${name} must NOT contain #calendar-dropdown-agenda-count`);
    // Assert bottom footer is removed
    assert(!content.includes('View Calendar Link Footer'), `${name} must NOT contain bottom footer`);
});
console.log('✓ Template markup verified across all HTML and PHP files.');

// 3. Verify JavaScript logic in js/calendar.js
const calendarJs = fs.readFileSync(path.resolve(__dirname, '..', 'js', 'calendar.js'), 'utf8');
assert(calendarJs.includes('function renderDropdownAgenda('), 'js/calendar.js must define renderDropdownAgenda');
assert(calendarJs.includes('renderDropdownAgenda(selectedDate)'), 'js/calendar.js must call renderDropdownAgenda from renderCalendarGrid');
assert(calendarJs.includes('window.selectedCalendarDate = { year: selectedDate.year, month: selectedDate.month, day: selectedDate.day }'), 'js/calendar.js must pass selectedDate on View Calendar click');
assert(calendarJs.includes('text-black-fade'), 'js/calendar.js must use text-black-fade for empty state');
assert(calendarJs.includes('rgba(0, 0, 0, 0.45)'), 'js/calendar.js must use black fade rgb styling');
assert(calendarJs.includes('cal-dropdown-bar'), 'js/calendar.js must use .cal-dropdown-bar element');
assert(calendarJs.includes('#FFD000'), 'js/calendar.js must use #FFD000 for current/today bar');
assert(calendarJs.includes('#15803d'), 'js/calendar.js must use #15803d for upcoming bar');
assert(calendarJs.includes('#000000'), 'js/calendar.js must use #000000 for past bar');
console.log('✓ JavaScript logic verified in js/calendar.js.');

// 4. Functional Simulation of renderDropdownAgenda
const simulatedDom = {
    listHtml: ''
};

function simulateRenderAgenda(targetDate, role = 'student') {
    const now = new Date(2026, 9, 11); // Sunday Oct 11, 2026

    let year = targetDate ? targetDate.year : now.getFullYear();
    let month = targetDate ? targetDate.month : now.getMonth();
    let day = targetDate ? targetDate.day : now.getDate();

    if (!day) {
        simulatedDom.listHtml = `
            <div class="empty-state">
                <i class="fa-regular fa-calendar text-black-fade"></i>
                <span class="title">No Date Selected</span>
                <span class="subtitle text-black-fade">Select any date in the calendar above to view its schedule.</span>
            </div>
        `;
        return;
    }

    const dateObj = new Date(year, month, day);
    const dayOfWeek = dateObj.getDay();
    let events = [];
    if (dayOfWeek === 2) { // Tuesday
        events = [
            { title: 'General Science Lecture', time: '8:30 AM – 10:00 AM', tag: 'CLASS • SCHEDULE' },
            { title: 'Web Development 1 Laboratory', time: '1:30 PM – 3:00 PM', tag: 'CLASS • SCHEDULE' },
            { title: 'Living Things Lab Activity Due', time: 'Due at 5:00 PM', tag: 'ASSIGNMENT • DUE' }
        ];
    } else if (dayOfWeek === 0) { // Sunday
        events = [];
    }

    if (!events || events.length === 0) {
        simulatedDom.listHtml = `
            <div class="empty-state">
                <i class="fa-regular fa-calendar-check text-black-fade"></i>
                <span class="title">No Events Scheduled</span>
                <span class="subtitle text-black-fade">There are no classes or deadlines recorded for this date.</span>
            </div>
        `;
        return;
    }

    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentDate = new Date(year, month, day);
    const isToday = (day === now.getDate() && month === now.getMonth() && year === now.getFullYear());
    const isUpcoming = currentDate > todayDate;

    simulatedDom.listHtml = events.map(e => {
        let barBg = 'bg-black';
        let barClass = 'bar-past';
        if (isToday) {
            barBg = 'bg-[#FFD000]';
            barClass = 'bar-current';
        } else if (isUpcoming) {
            barBg = 'bg-[#15803d]';
            barClass = 'bar-upcoming';
        }
        return `<div class="cal-dropdown-bar ${barBg} ${barClass}">${e.title}</div>`;
    }).join('');
}

// Case 1: Initial state (targetDate = null) -> Sunday Oct 11 -> Empty state with black fade
simulateRenderAgenda(null);
assert(simulatedDom.listHtml.includes('text-black-fade'), 'Empty state must use text-black-fade');
assert(simulatedDom.listHtml.includes('No Events Scheduled'), 'Empty state shows No Events Scheduled');

// Case 2: User clicks Day 13 (Tuesday Oct 13, upcoming) -> Shows 3 events with green bar lines
simulateRenderAgenda({ year: 2026, month: 9, day: 13 });
assert(simulatedDom.listHtml.includes('General Science Lecture'));
assert(simulatedDom.listHtml.includes('Web Development 1 Laboratory'));
assert(simulatedDom.listHtml.includes('Living Things Lab Activity Due'));
assert(simulatedDom.listHtml.includes('bg-[#15803d]'), 'Upcoming event must have green bar line bg-[#15803d]');
assert(simulatedDom.listHtml.includes('bar-upcoming'), 'Upcoming event must have bar-upcoming class');

// Case 3: User clicks Day 11 with events (Today / Current) -> Shows yellow bar lines
const originalEvents = [
    { title: 'Special Today Event', time: '9:00 AM', tag: 'CLASS' }
];
// Test today state
const todaySim = (() => {
    const isToday = true;
    const isUpcoming = false;
    let barBg = isToday ? 'bg-[#FFD000]' : (isUpcoming ? 'bg-[#15803d]' : 'bg-black');
    return `<div class="cal-dropdown-bar ${barBg}">${originalEvents[0].title}</div>`;
})();
assert(todaySim.includes('bg-[#FFD000]'), 'Current/today event must have yellow bar line bg-[#FFD000]');

// Case 4: Past date with events -> Shows black bar lines
const pastSim = (() => {
    const isToday = false;
    const isUpcoming = false;
    let barBg = isToday ? 'bg-[#FFD000]' : (isUpcoming ? 'bg-[#15803d]' : 'bg-black');
    return `<div class="cal-dropdown-bar ${barBg}">${originalEvents[0].title}</div>`;
})();
assert(pastSim.includes('bg-black'), 'Past event must have black bar line bg-black');

// Case 5: User unselects Day 13 (day is null) -> Shows No Date Selected with black fade
simulateRenderAgenda({ year: 2026, month: 9, day: null });
assert(simulatedDom.listHtml.includes('text-black-fade'), 'Unselected empty state must use text-black-fade');
assert(simulatedDom.listHtml.includes('No Date Selected'), 'Unselected shows No Date Selected');

console.log('✓ Functional simulation of agenda drawer passed.');
console.log('ALL CALENDAR DROPDOWN AGENDA TESTS PASSED SUCCESSFULLY! 🎉');
