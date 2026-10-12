const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

function exportWorkbook(file, scope, records) {
    const source = read(file);
    const start = source.indexOf('    window.executeAttendanceExport = function () {');
    const end = source.indexOf('\n    };', start) + '\n    };'.length;
    assert.ok(start >= 0 && end > start);
    let snippet = source.slice(start, end);
    if (file.includes('classroom-room')) {
        const helperStart = source.indexOf('    function buildAttendanceWorksheet(');
        snippet = source.slice(helperStart, start) + snippet;
    }
    let result;
    let closed = false;
    const warnings = [];
    const students = [
        { id: '1001', name: 'Dela Cruz, Juan Abad' },
        { id: '1002', name: 'Kalipungan, Herald Jamero' }
    ];
    const format = s => s.name;
    const window = {
        formatStudentLastFirstMiddle: format,
        closeAttendanceExportModal: () => { closed = true; },
        showToastNotification: (text, type) => { if (type === 'warning') warnings.push(text); }
    };
    const XLSX = {
        utils: {
            book_new: () => ({ SheetNames: [], Sheets: {} }),
            book_append_sheet: (wb, ws, name) => { wb.SheetNames.push(name); wb.Sheets[name] = ws; },
            aoa_to_sheet: rows => ({ rows, '!ref': 'A1' }),
            decode_range: () => ({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }),
            encode_cell: ({ r, c }) => `${r}:${c}`
        },
        writeFile: (workbook, filename) => { result = JSON.parse(JSON.stringify({ workbook, filename })); }
    };
    const context = vm.createContext({
        window, XLSX, document: { querySelector: () => ({ value: scope }) },
        attendanceViewingMonth: 9, attendanceViewingYear: 2026,
        currentClassroomSectionName: 'Rizal', currentClassroomKey: 'Rizal::Computer Programming 1',
        currentClassroomMeta: { subject: 'Computer Programming 1' }, studentsBySection: { Rizal: students },
        attendanceRecordsByClassroom: { 'Rizal::Computer Programming 1': records },
        getActiveRoomSectionName: () => 'Rizal', getActiveRoomSubjectName: () => 'Computer Programming 1',
        getAttendanceStudents: () => students,
        refreshAttendanceRecords: () => {}, findAttendanceClassroomRecord: () => ({ data: records }),
        getCurrentAttendanceStatuses: date => records[date]?.statuses || {},
        formatStudentLastFirstMiddle: format, studentNamesMatch: (a, b) => a === b,
        alert: text => warnings.push(text)
    });
    vm.runInContext(snippet, context);
    window.executeAttendanceExport();
    assert.equal(closed, true, 'Export closes the dialog');
    return { result, warnings };
}

const records = {
    '2026-09-30': { statuses: { '1001': 'L', '1002': 'E' } },
    '2026-10-06': { statuses: { '1001': 'P', '1002': 'A' } },
    '2026-10-07': { statuses: { 'Dela Cruz, Juan Abad': 'E', 'Kalipungan, Herald Jamero': 'L' } },
    '2026-10-08': { statuses: {} }
};
for (const scope of ['month', 'month-active', 'all']) {
    const admin = exportWorkbook('js/classroom-room.js', scope, records);
    const teacher = exportWorkbook('js/teacher.js', scope, records);
    assert.deepEqual(admin, teacher, `${scope}: admin and teacher workbooks match`);
    const { workbook, filename } = admin.result;
    assert.ok(filename.endsWith('.xlsx'));
    const sheet = workbook.Sheets[scope === 'all' ? 'All Records' : 'October'];
    const dateCount = scope === 'month' ? 31 : scope === 'month-active' ? 2 : 3;
    assert.equal(sheet.rows[4].length, 3 + dateCount + 4, 'Date columns respect selected scope');
    assert.equal(sheet.rows[5][2], '1001', 'Student IDs are retained');
    assert.deepEqual(sheet.rows[5].slice(-4), scope === 'all' ? [1, 0, 1, 1] : [1, 0, 0, 1]);
    assert.deepEqual(sheet.rows[6].slice(-4), scope === 'all' ? [0, 1, 1, 1] : [0, 1, 1, 0]);
    if (scope === 'all') assert.deepEqual(workbook.SheetNames, ['All Records', 'September', 'October']);
}
for (const scope of ['month-active', 'all']) {
    const admin = exportWorkbook('js/classroom-room.js', scope, {});
    assert.equal(admin.result, undefined, 'Empty recorded-date scopes do not download a workbook');
    assert.equal(admin.warnings.length, 1);
    assert.deepEqual(admin, exportWorkbook('js/teacher.js', scope, {}));
}

const css = require('postcss').parse(read('css/shared-components.css'));
const desktop = css.nodes.find(n => n.type === 'atrule' && n.params === '(min-width: 769px)' &&
    n.nodes.some(r => r.selector === '#attendance-export-modal .attendance-export-exit-btn'));
assert.ok(desktop, 'Attendance styling is restricted to desktop');
for (const [selector, property, value] of [
    ['.attendance-export-exit-btn', 'display', 'flex'],
    ['.attendance-export-exit-btn', 'top', '2.5rem'],
    ['.attendance-export-exit-btn', 'right', '2.5rem'],
    ['.attendance-export-exit-btn', 'width', '3rem'],
    ['.attendance-export-exit-btn', 'height', '3rem'],
    ['.attendance-export-exit-btn', 'color', '#000000'],
    ['.attendance-export-exit-btn', 'background-color', 'transparent'],
    ['.attendance-export-exit-btn:hover', 'background-color', '#e2e8f0'],
    ['.attendance-export-mobile-return-btn', 'display', 'none'],
    ['.attendance-export-cancel-btn', 'display', 'none'],
    ['.sigma-modal-header-top', 'justify-content', 'flex-start'],
    ['.sigma-modal-body', 'padding-bottom', '32px'],
    ['.sigma-modal-footer', 'justify-content', 'flex-end']
]) {
    const rule = desktop.nodes.find(n => n.selector === `#attendance-export-modal ${selector}`);
    assert.ok(rule.nodes.some(d => d.prop === property && d.value === value && d.important));
}
console.log('PASS: all three attendance export scopes match teacher output, totals and empty scopes verified; desktop controls scoped correctly.');
