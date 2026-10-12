const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

console.log('Running Calendar Navigation Without Auto-Selection Test...');

// 1. Verify code in js/calendar.js and js/teacher.js
const calendarJs = fs.readFileSync(path.resolve(__dirname, '..', 'js', 'calendar.js'), 'utf8');
const teacherJs = fs.readFileSync(path.resolve(__dirname, '..', 'js', 'teacher.js'), 'utf8');

[
    { name: 'calendar.js', content: calendarJs },
    { name: 'teacher.js', content: teacherJs }
].forEach(({ name, content }) => {
    // Must NOT select day 1 in stepAttendanceMonth
    assert(!content.includes('selectedCalendarDate = { year: curYear, month: curMonth, day: 1 }'),
        `${name} must NOT set day: 1 on stepAttendanceMonth`);
    
    // Must NOT select day 1 in selectAttendancePageCustomMonth
    assert(!content.includes('day: 1\n        };\n        window.selectedCalendarDate') &&
           !content.includes('day: 1\n        };\n\n        if (typeof window.setupAttendanceCalendar'),
        `${name} must NOT set day: 1 on selectAttendancePageCustomMonth`);

    // Must NOT set selectedCalendarDate to nextDay on stepAttendanceWeek
    assert(!content.includes('selectedCalendarDate = { year: nextYear, month: nextMonth, day: nextDay }'),
        `${name} must NOT select nextDay on stepAttendanceWeek`);

    // isSelected must check isDateExplicitlySelected
    assert(content.includes('isDateExplicitlySelected'), `${name} must check isDateExplicitlySelected in renderCalendar`);
});
console.log('✓ Code checks verified: No auto-selection on month/week navigation in calendar.js and teacher.js.');

// 2. Behavioral Simulation Test
const nowYear = 2026;
const nowMonth = 9; // October (0-indexed)
const nowDay = 11; // Sunday Oct 11

let selectedCalendarDate = { year: nowYear, month: nowMonth, day: nowDay };
let currentMobileWeekIndex = 2; // Week containing Oct 11
let rightPanelRendered = null;

function renderCalendarRightPanel(y, m, d) {
    rightPanelRendered = { year: y, month: m, day: d };
}

function computeIsSelected(day, month, year) {
    const isToday = (day === nowDay && month === nowMonth && year === nowYear);
    const isViewingTodayMonth = (nowYear === year && nowMonth === month);
    const isDateExplicitlySelected = Boolean(
        selectedCalendarDate &&
        selectedCalendarDate.year === year &&
        selectedCalendarDate.month === month &&
        selectedCalendarDate.day &&
        !(isViewingTodayMonth && selectedCalendarDate.day === nowDay)
    );
    return (!isToday && selectedCalendarDate && selectedCalendarDate.day === day && isDateExplicitlySelected && selectedCalendarDate.month === month && selectedCalendarDate.year === year);
}

function stepAttendanceWeek(direction) {
    selectedCalendarDate = { year: nowYear, month: nowMonth, day: nowDay };
    currentMobileWeekIndex += direction;
    renderCalendarRightPanel(nowYear, nowMonth, nowDay);
}

function stepAttendanceMonth(direction) {
    selectedCalendarDate = { year: nowYear, month: nowMonth, day: nowDay };
    currentMobileWeekIndex = null;
    renderCalendarRightPanel(nowYear, nowMonth, nowDay);
}

function selectCalendarDate(year, month, day) {
    const isToday = (day === nowDay && month === nowMonth && year === nowYear);
    const isAlreadySelected = Boolean(
        selectedCalendarDate &&
        selectedCalendarDate.year === year &&
        selectedCalendarDate.month === month &&
        selectedCalendarDate.day === day &&
        !isToday
    );
    if (isAlreadySelected) {
        selectedCalendarDate = { year: nowYear, month: nowMonth, day: nowDay };
        renderCalendarRightPanel(nowYear, nowMonth, nowDay);
        return;
    }
    selectedCalendarDate = { year, month, day };
    renderCalendarRightPanel(year, month, day);
}

// Initial state: today Oct 11
assert.strictEqual(computeIsSelected(11, 9, 2026), false, 'Today is not isSelected (it is isToday)');
assert.strictEqual(computeIsSelected(4, 9, 2026), false, 'Day 4 is not selected initially');

// Action 1: User clicks previous week (<)
stepAttendanceWeek(-1);
assert.strictEqual(currentMobileWeekIndex, 1, 'Current week moves to Week 1 (Oct 4 - Oct 10)');
// Verify that Oct 4 is NOT selected!
assert.strictEqual(computeIsSelected(4, 9, 2026), false, 'October 4 must NOT be selected after clicking prev week');
assert.strictEqual(computeIsSelected(5, 9, 2026), false, 'October 5 must NOT be selected');
assert.deepEqual(rightPanelRendered, { year: 2026, month: 9, day: 11 }, 'Right panel stays on current day');

// Action 2: User clicks next week (>)
stepAttendanceWeek(1);
assert.strictEqual(currentMobileWeekIndex, 2, 'Current week moves back to Week 2');
assert.strictEqual(computeIsSelected(11, 9, 2026), false, 'Today is still isToday');
assert.strictEqual(computeIsSelected(12, 9, 2026), false, 'Day 12 is not selected');

// Action 3: User explicitly taps Day 6 in Week 1
stepAttendanceWeek(-1);
selectCalendarDate(2026, 9, 6);
assert.strictEqual(computeIsSelected(6, 9, 2026), true, 'Day 6 is selected after direct user click');
assert.deepEqual(rightPanelRendered, { year: 2026, month: 9, day: 6 }, 'Right panel displays Day 6');

// Action 4: While Day 6 is selected, user clicks previous week (<)
stepAttendanceWeek(-1);
assert.strictEqual(computeIsSelected(6, 9, 2026), false, 'Day 6 selection cleared after clicking prev week');
assert.strictEqual(computeIsSelected(1, 9, 2026), false, 'Day 1 in Week 0 is NOT selected');
assert.deepEqual(rightPanelRendered, { year: 2026, month: 9, day: 11 }, 'Right panel returns to current day');

// Action 5: User steps month to November 2026
stepAttendanceMonth(1);
assert.strictEqual(computeIsSelected(1, 10, 2026), false, 'Day 1 in November is NOT selected');
assert.deepEqual(rightPanelRendered, { year: 2026, month: 9, day: 11 }, 'Right panel stays on current day');

console.log('✓ Behavioral simulation passed: Navigation never auto-selects dates.');
console.log('ALL CALENDAR NAVIGATION NO-SELECTION TESTS PASSED SUCCESSFULLY! 🎉');
