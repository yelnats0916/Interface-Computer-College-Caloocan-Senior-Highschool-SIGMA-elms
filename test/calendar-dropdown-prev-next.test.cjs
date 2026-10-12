const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

console.log('Running Calendar Dropdown Prev & Next Month Navigation Test...');

// 1. Verify code in js/calendar.js
const calendarJs = fs.readFileSync(path.resolve(__dirname, '..', 'js', 'calendar.js'), 'utf8');

assert(calendarJs.includes('window.navCalendarDropdownMonth = function'), 'js/calendar.js must define window.navCalendarDropdownMonth');
assert(calendarJs.includes('currentCalendarDate.getMonth() + delta, 1'), 'js/calendar.js must normalize day to 1 to avoid month overflow bugs');
assert(calendarJs.includes("closest('#calendarDropdownPrevMonthBtn')"), 'js/calendar.js must support delegation for prevMonthBtn');
assert(calendarJs.includes("closest('#calendarDropdownNextMonthBtn')"), 'js/calendar.js must support delegation for nextMonthBtn');
assert(calendarJs.includes("window._calDropdownNavDelegated"), 'js/calendar.js must register click delegation');
assert(calendarJs.includes("sigma:calendar-date-unselect"), 'js/calendar.js must dispatch unselect event on month change');

console.log('✓ Code structure verified in js/calendar.js.');

// 2. Verify code in js/student.js
const studentJs = fs.readFileSync(path.resolve(__dirname, '..', 'js', 'student.js'), 'utf8');
assert(!studentJs.includes('currentCalDate.setMonth'), 'js/student.js must NOT reference undefined currentCalDate');
assert(studentJs.includes('window.navCalendarDropdownMonth(-1, e)'), 'js/student.js prevMonthBtn must call window.navCalendarDropdownMonth(-1, e)');
assert(studentJs.includes('window.navCalendarDropdownMonth(1, e)'), 'js/student.js nextMonthBtn must call window.navCalendarDropdownMonth(1, e)');

console.log('✓ Student portal event handlers verified in js/student.js.');

// 3. Verify markup in all templates
const templates = [
    { name: 'student.html', content: fs.readFileSync(path.resolve(__dirname, '..', 'student.html'), 'utf8') },
    { name: 'teacher.html', content: fs.readFileSync(path.resolve(__dirname, '..', 'teacher.html'), 'utf8') },
    { name: 'admin.html', content: fs.readFileSync(path.resolve(__dirname, '..', 'admin.html'), 'utf8') },
    { name: 'php/includes/topbar.php', content: fs.readFileSync(path.resolve(__dirname, '..', 'php', 'includes', 'topbar.php'), 'utf8') }
];

templates.forEach(({ name, content }) => {
    assert(content.includes('id="calendarDropdownPrevMonthBtn"'), `${name} must contain id="calendarDropdownPrevMonthBtn"`);
    assert(content.includes('id="calendarDropdownNextMonthBtn"'), `${name} must contain id="calendarDropdownNextMonthBtn"`);
    assert(content.includes('onclick="window.navCalendarDropdownMonth?.(-1, event)"'), `${name} must have prev inline fallback onclick`);
    assert(content.includes('onclick="window.navCalendarDropdownMonth?.(1, event)"'), `${name} must have next inline fallback onclick`);
});

console.log('✓ All portal templates verified with prev & next buttons.');

// 4. Behavioral Simulation: Date arithmetic & boundary rollover protection
function testMonthNavigation(initialYear, initialMonth, initialDay, delta) {
    let date = new Date(initialYear, initialMonth, initialDay);
    // Safe formula used in calendar.js:
    date = new Date(date.getFullYear(), date.getMonth() + delta, 1);
    return { year: date.getFullYear(), month: date.getMonth(), day: date.getDate() };
}

// Case 4a: Oct 31, 2026 -> step back 1 month -> MUST BE September (month index 8), NOT October!
const fromOct31Prev = testMonthNavigation(2026, 9, 31, -1);
assert.strictEqual(fromOct31Prev.month, 8, 'Stepping back from Oct 31 must reach September (month 8)');
assert.strictEqual(fromOct31Prev.year, 2026, 'Year must remain 2026');
assert.strictEqual(fromOct31Prev.day, 1, 'Day must be normalized to 1');

// Case 4b: Oct 31, 2026 -> step forward 1 month -> MUST BE November (month index 10)
const fromOct31Next = testMonthNavigation(2026, 9, 31, 1);
assert.strictEqual(fromOct31Next.month, 10, 'Stepping forward from Oct 31 must reach November (month 10)');
assert.strictEqual(fromOct31Next.year, 2026, 'Year must remain 2026');
assert.strictEqual(fromOct31Next.day, 1, 'Day must be normalized to 1');

// Case 4c: March 31, 2026 -> step back 1 month -> MUST BE February (month index 1)
const fromMar31Prev = testMonthNavigation(2026, 2, 31, -1);
assert.strictEqual(fromMar31Prev.month, 1, 'Stepping back from March 31 must reach February (month 1)');
assert.strictEqual(fromMar31Prev.year, 2026, 'Year must remain 2026');

// Case 4d: January 15, 2026 -> step back 1 month -> MUST BE December 2025
const fromJanPrev = testMonthNavigation(2026, 0, 15, -1);
assert.strictEqual(fromJanPrev.month, 11, 'Stepping back from January must reach December (month 11)');
assert.strictEqual(fromJanPrev.year, 2025, 'Year must decrement to 2025');

// Case 4e: December 15, 2026 -> step forward 1 month -> MUST BE January 2027
const fromDecNext = testMonthNavigation(2026, 11, 15, 1);
assert.strictEqual(fromDecNext.month, 0, 'Stepping forward from December must reach January (month 0)');
assert.strictEqual(fromDecNext.year, 2027, 'Year must increment to 2027');

console.log('✓ Behavioral simulation passed: 31-day overflows and year crossings handled flawlessly.');
console.log('ALL CALENDAR DROPDOWN PREV/NEXT NAVIGATION TESTS PASSED! 🎉');
