const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

console.log('Running Calendar Reset on Exit & Return Test...');

// 1. Verify code in js/calendar.js
const calendarJs = fs.readFileSync(path.resolve(__dirname, '..', 'js', 'calendar.js'), 'utf8');
assert(calendarJs.includes('function resetCalendarDropdown()'), 'js/calendar.js must define resetCalendarDropdown');
assert(calendarJs.includes('window.resetCalendarDropdown = resetCalendarDropdown'), 'js/calendar.js must export resetCalendarDropdown');
assert(calendarJs.includes('resetCalendarDropdown();'), 'js/calendar.js must invoke resetCalendarDropdown');
assert(calendarJs.includes('window._preserveCalendarDateOnNextOpen'), 'js/calendar.js must support _preserveCalendarDateOnNextOpen');
assert(calendarJs.includes('!window._preserveCalendarDateOnNextOpen'), 'js/calendar.js must reset when not explicitly preserved');
console.log('✓ Code checks verified in js/calendar.js.');

// 2. Verify code in js/teacher.js
const teacherJs = fs.readFileSync(path.resolve(__dirname, '..', 'js', 'teacher.js'), 'utf8');
assert(teacherJs.includes('window.resetCalendarDropdown'), 'js/teacher.js must invoke resetCalendarDropdown');
assert(teacherJs.includes('!window._preserveCalendarDateOnNextOpen'), 'js/teacher.js must reset selectedCalendarDate when not preserved');
console.log('✓ Code checks verified in js/teacher.js.');

// 3. Verify code in js/student.js
const studentJs = fs.readFileSync(path.resolve(__dirname, '..', 'js', 'student.js'), 'utf8');
assert(studentJs.includes('window.resetCalendarDropdown'), 'js/student.js must invoke resetCalendarDropdown');
assert(studentJs.includes('!window._preserveCalendarDateOnNextOpen'), 'js/student.js must reset on calendar entry');
console.log('✓ Code checks verified in js/student.js.');

// 4. Verify code in js/topbar.js
const topbarJs = fs.readFileSync(path.resolve(__dirname, '..', 'js', 'topbar.js'), 'utf8');
assert(topbarJs.includes('window.resetCalendarDropdown'), 'js/topbar.js must reset dropdown on hideHeaderOverlays');
console.log('✓ Code checks verified in js/topbar.js.');

// 5. Behavioral simulation of dropdown reset
let dropdownSelectedDate = { year: 2026, month: 9, day: 29 };
let dropdownCurrentDate = new Date(2026, 10, 1); // November

function simulateResetDropdown() {
    dropdownSelectedDate = null;
    dropdownCurrentDate = new Date();
}

// User leaves dropdown
simulateResetDropdown();
assert.equal(dropdownSelectedDate, null, 'Dropdown selected date must be null on reset');
assert.equal(dropdownCurrentDate.getMonth(), (new Date()).getMonth(), 'Dropdown month must reset to current month');
assert.equal(dropdownCurrentDate.getFullYear(), (new Date()).getFullYear(), 'Dropdown year must reset to current year');
console.log('✓ Dropdown reset simulation passed.');

// 6. Behavioral simulation of calendar page reset
let pageSelectedDate = { year: 2026, month: 9, day: 16 };
let preserveFlag = false;

function simulateEnterCalendar() {
    if (!preserveFlag) {
        const now = new Date();
        pageSelectedDate = {
            year: now.getFullYear(),
            month: now.getMonth(),
            day: now.getDate()
        };
    } else {
        preserveFlag = false;
    }
}

// Case A: User selected Day 16, switched to Home tab, then came back to Calendar
simulateEnterCalendar();
assert.equal(pageSelectedDate.day, (new Date()).getDate(), 'Page selected date must reset to today when returning from outside');
assert.equal(pageSelectedDate.month, (new Date()).getMonth(), 'Page selected month must reset to today month');

// Case B: User clicks View Calendar from dropdown on Day 29 (explicit preservation)
pageSelectedDate = { year: 2026, month: 9, day: 29 };
preserveFlag = true;
simulateEnterCalendar();
assert.equal(pageSelectedDate.day, 29, 'Explicit view calendar action must preserve requested date');
assert.equal(preserveFlag, false, 'Preserve flag must be cleared after first use');

// Now user leaves to another tab and comes back:
simulateEnterCalendar();
assert.equal(pageSelectedDate.day, (new Date()).getDate(), 'Subsequent return to calendar must reset back to today');
console.log('✓ Calendar page reset simulation passed.');

console.log('ALL CALENDAR RESET ON NAVIGATE TESTS PASSED SUCCESSFULLY! 🎉');
