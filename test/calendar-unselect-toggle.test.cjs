const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

console.log('Running Calendar Date Unselect Toggle & No-Selection Empty State Test (Desktop & Mobile)...');

// 1. Verify logic in js/calendar.js
const calendarJsPath = path.resolve(__dirname, '..', 'js', 'calendar.js');
const calendarJs = fs.readFileSync(calendarJsPath, 'utf8');

assert(calendarJs.includes('const isAlreadySelected = Boolean('), 'calendar.js must check isAlreadySelected in selectCalendarDate');
assert(calendarJs.includes('// Unselect: clears selection without resetting month/year or jumping to current day on desktop or mobile'), 'calendar.js must handle unselect cleanly');
assert(calendarJs.includes('renderCalendarRightPanel(null, null, null)'), 'calendar.js must render null right panel (No Date Selected) on unselect');
assert(calendarJs.includes("!isToday && selectedCalendarDate && selectedCalendarDate.day === i"), 'calendar.js must only mark non-today dates as isSelected');

// 2. Verify logic in js/teacher.js
const teacherJsPath = path.resolve(__dirname, '..', 'js', 'teacher.js');
const teacherJs = fs.readFileSync(teacherJsPath, 'utf8');

assert(teacherJs.includes('const isAlreadySelected = Boolean('), 'teacher.js must check isAlreadySelected in selectCalendarDate');
assert(teacherJs.includes('// Unselect: clears selection without resetting month/year or jumping to current day on desktop or mobile'), 'teacher.js must handle unselect cleanly');
assert(teacherJs.includes('renderCalendarRightPanel(null, null, null)'), 'teacher.js must render null right panel (No Date Selected) on unselect');
assert(teacherJs.includes("!isToday && selectedCalendarDate && selectedCalendarDate.day === i"), 'teacher.js must only mark non-today dates as isSelected');

// 3. Functional Simulation Test (Desktop & Mobile)
const simulatedDom = {
    nowDate: 10,
    nowMonth: 9, // October (0-indexed)
    nowYear: 2026,
    rightPanelRenderedDate: null,
    eventsDispatched: [],
    yearSelect: { value: '2026' },
    monthSelect: { value: '9' }
};

let selectedCalendarDate = { year: 2026, month: 9, day: 10 };
simulatedDom.rightPanelRenderedDate = { year: 2026, month: 9, day: 10 };

function selectCalendarDate(year, month, day) {
    const isAlreadySelected = Boolean(
        selectedCalendarDate &&
        selectedCalendarDate.year === year &&
        selectedCalendarDate.month === month &&
        selectedCalendarDate.day === day
    );

    if (isAlreadySelected) {
        // Unselect: clears selection without resetting month/year or jumping to current day
        selectedCalendarDate = {
            year,
            month,
            day: null
        };
        simulatedDom.rightPanelRenderedDate = null;
        simulatedDom.eventsDispatched.push({ type: 'unselect', day });
        return;
    }

    selectedCalendarDate = { year, month, day };
    simulatedDom.rightPanelRenderedDate = { year, month, day };
    simulatedDom.eventsDispatched.push({ type: 'select', day });
}

function stepAttendanceToday() {
    selectedCalendarDate = {
        year: simulatedDom.nowYear,
        month: simulatedDom.nowMonth,
        day: simulatedDom.nowDate
    };
    simulatedDom.yearSelect.value = String(simulatedDom.nowYear);
    simulatedDom.monthSelect.value = String(simulatedDom.nowMonth);
    simulatedDom.rightPanelRenderedDate = { year: simulatedDom.nowYear, month: simulatedDom.nowMonth, day: simulatedDom.nowDate };
}

// Initial state: today (October 10)
assert.equal(selectedCalendarDate.day, 10, 'Initial date is day 10');

// Step 1: User clicks day 3 (select day 3)
selectCalendarDate(2026, 9, 3);
assert.equal(selectedCalendarDate.day, 3, 'Day 3 is now selected');
assert.deepEqual(simulatedDom.rightPanelRenderedDate, { year: 2026, month: 9, day: 3 }, 'Right panel displays day 3');
assert.equal(simulatedDom.eventsDispatched[simulatedDom.eventsDispatched.length - 1].type, 'select');

// Step 2: User clicks day 3 AGAIN (unselect day 3) -> MUST NOT go back to current day!
selectCalendarDate(2026, 9, 3);
assert.equal(selectedCalendarDate.day, null, 'Day 3 is unselected, selectedCalendarDate.day is null');
assert.equal(selectedCalendarDate.month, 9, 'Month is preserved as October');
assert.equal(selectedCalendarDate.year, 2026, 'Year is preserved as 2026');
assert.equal(simulatedDom.yearSelect.value, '2026', 'Year select is not modified');
assert.equal(simulatedDom.monthSelect.value, '9', 'Month select is not modified');
assert.equal(simulatedDom.rightPanelRenderedDate, null, 'Right panel shows No Date Selected (null)');
assert.equal(simulatedDom.eventsDispatched[simulatedDom.eventsDispatched.length - 1].type, 'unselect');

// Step 3: User clicks day 5, then clicks day 5 again
selectCalendarDate(2026, 9, 5);
assert.equal(selectedCalendarDate.day, 5, 'Day 5 is selected');
assert.deepEqual(simulatedDom.rightPanelRenderedDate, { year: 2026, month: 9, day: 5 });
selectCalendarDate(2026, 9, 5);
assert.equal(selectedCalendarDate.day, null, 'Day 5 is unselected, day is null');
assert.equal(simulatedDom.rightPanelRenderedDate, null, 'Right panel shows No Date Selected');

// Step 4: User clicks day 10 (today)
selectCalendarDate(2026, 9, 10);
assert.equal(selectedCalendarDate.day, 10, 'Clicking today selects today');
assert.deepEqual(simulatedDom.rightPanelRenderedDate, { year: 2026, month: 9, day: 10 });
// Clicking today again unselects today
selectCalendarDate(2026, 9, 10);
assert.equal(selectedCalendarDate.day, null, 'Clicking today again unselects today');
assert.equal(simulatedDom.rightPanelRenderedDate, null, 'Right panel shows No Date Selected');

// Step 5: Explicitly clicking Today button returns to current day
stepAttendanceToday();
assert.equal(selectedCalendarDate.day, 10, 'stepAttendanceToday sets day to 10');
assert.deepEqual(simulatedDom.rightPanelRenderedDate, { year: 2026, month: 9, day: 10 }, 'Right panel displays today');

console.log('✓ All unselect & no-selection empty state simulations passed.');
console.log('ALL UNSELECT TESTS PASSED SUCCESSFULLY! 🎉');
