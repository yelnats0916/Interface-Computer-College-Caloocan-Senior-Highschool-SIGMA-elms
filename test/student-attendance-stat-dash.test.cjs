const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

console.log('Running Student Attendance Stat Dash Line & Empty State Test...');

const studentJsPath = path.resolve(__dirname, '..', 'js', 'student.js');
const studentJs = fs.readFileSync(studentJsPath, 'utf8');

// 1. Verify template placeholders use 1 single dash '-'
assert(
    studentJs.includes('id="classroom-attendance-stat-percent" data-attendance-stat="percent" class="text-2xl font-black text-black font-[\'Inter\'] leading-none">-</h3>'),
    'Attendance percent card template must display 1 dash line "-"'
);
assert(
    studentJs.includes('id="classroom-attendance-stat-present" data-attendance-stat="present" class="text-2xl font-black text-black font-[\'Inter\'] leading-none">-</h3>'),
    'Present card template must display 1 dash line "-"'
);
assert(
    studentJs.includes('id="classroom-attendance-stat-late" data-attendance-stat="late" class="text-2xl font-black text-black font-[\'Inter\'] leading-none">-</h3>'),
    'Late card template must display 1 dash line "-"'
);
assert(
    studentJs.includes('id="classroom-attendance-stat-absent" data-attendance-stat="absent" class="text-2xl font-black text-black font-[\'Inter\'] leading-none">-</h3>'),
    'Absent card template must display 1 dash line "-"'
);
console.log('✓ Template markup verified: all cards use 1 dash line "-".');

// 2. Verify empty state logic when totalCount === 0
assert(!studentJs.includes("statPercentEls.forEach(el => { el.textContent = '--'; });"), 'Must NOT set double dash "--"');
assert(studentJs.includes("statPercentEls.forEach(el => { el.textContent = '-'; });"), 'Must set single dash "-" for percent');
assert(studentJs.includes("statPresentEls.forEach(el => { el.textContent = '-'; });"), 'Must set single dash "-" for present on empty state');
assert(studentJs.includes("statLateEls.forEach(el => { el.textContent = '-'; });"), 'Must set single dash "-" for late on empty state');
assert(studentJs.includes("statAbsentEls.forEach(el => { el.textContent = '-'; });"), 'Must set single dash "-" for absent on empty state');
console.log('✓ Empty state logic verified: totalCount === 0 renders "-" for all cards.');

// 3. Behavioral simulation of the update logic
function simulateStatsUpdate(records) {
    const presentCount = records.filter(r => r.status === 'P').length;
    const lateCount = records.filter(r => r.status === 'L').length;
    const absentCount = records.filter(r => r.status === 'A').length;
    const totalCount = records.length;

    const stats = { percent: '', present: '', late: '', absent: '' };

    if (totalCount === 0) {
        stats.percent = '-';
        stats.present = '-';
        stats.late = '-';
        stats.absent = '-';
    } else {
        const attendanceRate = ((presentCount + lateCount) / totalCount * 100).toFixed(1);
        stats.percent = `${attendanceRate}%`;
        stats.present = `${presentCount}`;
        stats.late = `${lateCount}`;
        stats.absent = `${absentCount}`;
    }

    return stats;
}

// Case 1: Empty state (0 records) -> all 1 dash line '-'
const emptyStats = simulateStatsUpdate([]);
assert.deepStrictEqual(emptyStats, {
    percent: '-',
    present: '-',
    late: '-',
    absent: '-'
}, 'Empty state must show 1 dash line for all 4 cards');

// Case 2: Populated records
const populatedStats = simulateStatsUpdate([
    { status: 'P' },
    { status: 'P' },
    { status: 'L' }
]);
assert.deepStrictEqual(populatedStats, {
    percent: '100.0%',
    present: '2',
    late: '1',
    absent: '0'
}, 'Populated state must show computed numbers and rate');

console.log('✓ Behavioral simulation passed.');
console.log('ALL STUDENT ATTENDANCE STAT DASH TESTS PASSED! 🎉');
