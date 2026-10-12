const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

console.log('Running Calendar Selection on Page & No Circles Around Numbers Test...');

// 1. Verify CSS rules: NO circle rings on date numbers
const calendarCss = fs.readFileSync(path.resolve(__dirname, '..', 'css', 'calendar.css'), 'utf8');
const teacherCss = fs.readFileSync(path.resolve(__dirname, '..', 'css', 'teacher.css'), 'utf8');
const topbarCss = fs.readFileSync(path.resolve(__dirname, '..', 'css', 'topbar.css'), 'utf8');

[
    { name: 'css/calendar.css', content: calendarCss },
    { name: 'css/teacher.css', content: teacherCss }
].forEach(({ name, content }) => {
    assert(!content.includes('.calendar-grid-date-num--event-ring'), `${name} must NOT include .calendar-grid-date-num--event-ring (circles removed per user request)`);
    assert(!content.includes('.calendar-day-cell--event-ring'), `${name} must NOT include .calendar-day-cell--event-ring`);
});
console.log('✓ CSS verification: No circles/rings around calendar numbers confirmed in both stylesheets.');

// 2. Verify JS implementation: No rings in renderDayCell
const calendarJs = fs.readFileSync(path.resolve(__dirname, '..', 'js', 'calendar.js'), 'utf8');
const teacherJs = fs.readFileSync(path.resolve(__dirname, '..', 'js', 'teacher.js'), 'utf8');
const topbarJs = fs.readFileSync(path.resolve(__dirname, '..', 'js', 'topbar.js'), 'utf8');

assert(!calendarJs.includes('calendar-grid-date-num--event-ring'), 'js/calendar.js must NOT assign calendar-grid-date-num--event-ring');
assert(!teacherJs.includes('calendar-grid-date-num--event-ring'), 'js/teacher.js must NOT assign calendar-grid-date-num--event-ring');
console.log('✓ JS verification: No circle rings rendered in calendar.js or teacher.js.');

// 3. Verify calendar panel and View Calendar navigation
const teacherHtml = fs.readFileSync(path.resolve(__dirname, '..', 'teacher.html'), 'utf8');
assert(teacherHtml.includes('id="calendar-dropdown"'), 'teacher.html must contain #calendar-dropdown');
assert(teacherHtml.includes('view-calendar-anchor'), 'teacher.html must contain .view-calendar-anchor');
assert(calendarJs.includes("switchTab('nav-attendance')"), 'calendar.js must navigate to nav-attendance on View Calendar click');
assert(topbarJs.includes("calendarDropdown.classList.remove('hidden')"), 'topbar.js must show calendarDropdown when calendar toggle is clicked');
assert(topbarJs.includes("calendarDropdown.classList.add('hidden')"), 'topbar.js must dismiss calendarDropdown when toggled off');
assert(topbarCss.includes('body.calendar-page-mode #calendar-dropdown'), 'topbar.css must keep calendar-dropdown hidden while on calendar page');
assert(calendarCss.includes('body.calendar-page-mode #calendar-dropdown'), 'calendar.css must keep calendar-dropdown hidden while on calendar page');
assert(topbarJs.includes('if (isCalendarMode)'), 'topbar.js must prevent opening calendar dropdown when already on calendar page');

console.log('✓ Calendar dropdown panel with View Calendar navigation and hidden-on-page behavior verified.');
console.log('ALL CALENDAR SELECTION & NO-CIRCLES TESTS PASSED SUCCESSFULLY! 🎉');
