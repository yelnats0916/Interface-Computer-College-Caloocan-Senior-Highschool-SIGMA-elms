const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

console.log('Running Shared Calendar Page & Role-Specific Events Verification Test...');

// 1. Shared PHP Include Component
const calendarPhpPath = path.resolve(__dirname, '..', 'php', 'includes', 'calendar_page.php');
assert(fs.existsSync(calendarPhpPath), 'php/includes/calendar_page.php must exist');
const calendarPhp = fs.readFileSync(calendarPhpPath, 'utf8');

assert(calendarPhp.includes('id="section-attendance"'), 'calendar_page.php must contain #section-attendance');
assert(calendarPhp.includes('id="attendance-left-column"'), 'calendar_page.php must contain #attendance-left-column');
assert(calendarPhp.includes('class="calendar-controls-toolbar"'), 'calendar_page.php must contain .calendar-controls-toolbar');
assert(calendarPhp.includes('id="attendance-today-btn"'), 'calendar_page.php must contain #attendance-today-btn');
assert(calendarPhp.includes('id="attendance-month-year-label"'), 'calendar_page.php must contain #attendance-month-year-label');
assert(calendarPhp.includes('id="attendance-month-picker-btn"'), 'calendar_page.php must contain #attendance-month-picker-btn');
assert(calendarPhp.includes('id="attendance-page-month-picker"'), 'calendar_page.php must contain #attendance-page-month-picker');
assert(calendarPhp.includes('id="attendance-full-calendar-grid"'), 'calendar_page.php must contain #attendance-full-calendar-grid');
assert(calendarPhp.includes('id="calendar-right-panel"'), 'calendar_page.php must contain #calendar-right-panel');
assert(calendarPhp.includes('id="calendar-right-panel-date"'), 'calendar_page.php must contain #calendar-right-panel-date');
assert(calendarPhp.includes('id="calendar-right-panel-day"'), 'calendar_page.php must contain #calendar-right-panel-day');
assert(calendarPhp.includes('id="calendar-right-panel-content"'), 'calendar_page.php must contain #calendar-right-panel-content');
assert(!calendarPhp.includes('id="calendar-panel-jump-today-btn"'), 'calendar_page.php must NOT contain #calendar-panel-jump-today-btn (deleted)');
assert(calendarPhp.includes('id="calendar-right-panel-items-count"'), 'calendar_page.php must contain #calendar-right-panel-items-count');

console.log('✓ Shared PHP Component verified.');

// 2. PHP Portals Inclusion
const teacherPhpPath = path.resolve(__dirname, '..', 'php', 'teacher.php');
const studentPhpPath = path.resolve(__dirname, '..', 'php', 'student.php');
const adminPhpPath = path.resolve(__dirname, '..', 'php', 'admin.php');

const teacherPhp = fs.readFileSync(teacherPhpPath, 'utf8');
const studentPhp = fs.readFileSync(studentPhpPath, 'utf8');
const adminPhp = fs.readFileSync(adminPhpPath, 'utf8');

assert(teacherPhp.includes("include __DIR__ . '/includes/calendar_page.php';"), 'php/teacher.php must include calendar_page.php');
assert(studentPhp.includes("include __DIR__ . '/includes/calendar_page.php';"), 'php/student.php must include calendar_page.php');
assert(adminPhp.includes("include __DIR__ . '/includes/calendar_page.php';"), 'php/admin.php must include calendar_page.php');

console.log('✓ All 3 PHP portals include shared calendar component.');

// 3. Static HTML Exact Shared Markup
const teacherHtmlPath = path.resolve(__dirname, '..', 'teacher.html');
const studentHtmlPath = path.resolve(__dirname, '..', 'student.html');
const adminHtmlPath = path.resolve(__dirname, '..', 'admin.html');

const teacherHtml = fs.readFileSync(teacherHtmlPath, 'utf8');
const studentHtml = fs.readFileSync(studentHtmlPath, 'utf8');
const adminHtml = fs.readFileSync(adminHtmlPath, 'utf8');

function extractCalendarSection(html, name) {
    const startIdx = html.indexOf('<section id="section-attendance"');
    assert(startIdx !== -1, `${name} must contain <section id="section-attendance"`);
    const endMarker = '</section>';
    const endIdx = html.indexOf(endMarker, startIdx);
    assert(endIdx !== -1, `${name} must contain closing </section> for attendance`);
    return html.substring(startIdx, endIdx + endMarker.length).trim().replace(/\r\n/g, '\n');
}

const teacherSection = extractCalendarSection(teacherHtml, 'teacher.html');
const studentSection = extractCalendarSection(studentHtml, 'student.html');
const adminSection = extractCalendarSection(adminHtml, 'admin.html');

assert.equal(studentSection, teacherSection, 'student.html and teacher.html calendar section markup must be 100% exact identical code');
assert.equal(adminSection, teacherSection, 'admin.html and teacher.html calendar section markup must be 100% exact identical code');

console.log('✓ teacher.html, student.html, and admin.html have 100% exact identical shared calendar markup.');

// 4. Role-Specific Events in js/calendar.js
const calendarJsPath = path.resolve(__dirname, '..', 'js', 'calendar.js');
const calendarJs = fs.readFileSync(calendarJsPath, 'utf8');

assert(calendarJs.includes('function getPortalRoleKey()'), 'calendar.js must define getPortalRoleKey()');
assert(calendarJs.includes('function getCalendarEventsForDate('), 'calendar.js must define getCalendarEventsForDate()');

// Verify all fake events have been deleted across all roles
assert(!calendarJs.includes('Logic Gates Quiz Submission'), 'Fake teacher events must be deleted');
assert(!calendarJs.includes('Server Backup & Cloud Maintenance'), 'Fake teacher/admin events must be deleted');
assert(!calendarJs.includes('General Science Lecture'), 'Fake student events must be deleted');
assert(!calendarJs.includes('Web Development 1 Laboratory'), 'Fake student events must be deleted');
assert(!calendarJs.includes('Faculty Grade Submission Deadline'), 'Fake admin events must be deleted');
assert(!calendarJs.includes('Curriculum Syllabus Audit & Verification'), 'Fake admin events must be deleted');
assert(!calendarJs.includes('All-Faculty General Meeting'), 'Fake admin events must be deleted');
assert(!calendarJs.includes('2nd Quarter Enrollment Masterlist Review'), 'Fake admin events must be deleted');

console.log('✓ Verified all fake events deleted across Teacher, Student, and Admin roles.');

// 5. Routing & Active State in admin.js and student.js
const adminJsPath = path.resolve(__dirname, '..', 'js', 'admin.js');
const adminJs = fs.readFileSync(adminJsPath, 'utf8');
assert(adminJs.includes("'nav-attendance': 'section-attendance'"), 'admin.js navSectionMap must include nav-attendance');
assert(adminJs.includes("tabId === 'nav-attendance'"), 'admin.js switchTab must handle nav-attendance');
assert(adminJs.includes("hash === 'nav-attendance' || hash === 'nav_attendance'"), 'admin.js handleAdminRouteOrPopState must handle nav_attendance');

const studentJsPath = path.resolve(__dirname, '..', 'js', 'student.js');
const studentJs = fs.readFileSync(studentJsPath, 'utf8');
assert(studentJs.includes("'nav-attendance': 'section-attendance'"), 'student.js sectionMap must include nav-attendance');
assert(studentJs.includes("navId === 'nav-attendance'"), 'student.js _applyTab must handle nav-attendance');
assert(studentJs.includes("'nav-attendance': 'Calendar'"), 'student.js navContextMap must set Calendar');

console.log('✓ Admin and Student portal routing and tab synchronization verified.');
console.log('ALL SHARED CALENDAR TESTS PASSED SUCCESSFULLY! 🎉');
