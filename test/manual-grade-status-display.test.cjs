const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/shared-components.js'), 'utf8').replace(/\r\n/g, '\n');
const start = source.indexOf('    const result = {\n        studentUser,', source.indexOf('    const manualClosure = window.readAssessmentClosure?.'));
const end = source.indexOf('    if (window._studentAssessmentDetailsCache)', start);
for (const status of ['missing', 'absent', 'incomplete', 'excuse']) {
    const context = { studentUser: {}, sub: null, numericScore: 42, turnedIn: false, isQuizPending: false,
        isGraded: true, statusName: 'Not Submitted', manualClosure: { score: 42, status }, normalizedTone: 'none', cat: 'quiz', tab: 'assessments', maxScore: 55 };
    const result = vm.runInNewContext(`(function () { ${source.slice(start, end)} return result; })()`, context);
    assert.equal(result.attendanceTone, status);
    assert.equal(result.numericScore, 42);
    assert.equal(result.turnedIn, false);
}
console.log('PASS: closed unsubmitted grades retain all saved MAIE labels without implying submission');
const closureStart = source.indexOf('    if (manualGradeRecord && !window.findAssessmentSubmittedWork?.');
const closureEnd = source.indexOf('    const resolvedHps', closureStart);
const pendingStart = source.indexOf('    const isQuizPending = Boolean(');
const pendingEnd = source.indexOf('    if (isQuizPending)', pendingStart);
for (const status of ['missing', 'absent', 'incomplete', 'excuse']) {
    const grade = vm.runInNewContext(`(function () { ${source.slice(closureStart, closureEnd)} })()`, {
        manualGradeRecord: { score: '', status }, window: {}, student: {}, foundItem: {}, subj: 'prog1', section: 'Rizal', q: 1
    });
    assert.equal(grade.isManualOverride, true);
    assert.equal(grade.teacherSaved, true);
    assert.equal(grade.status, status);
    const pending = vm.runInNewContext(`(function () { ${source.slice(pendingStart, pendingEnd)} return isQuizPending; })()`, {
        normalizedTone: status, isQuizAss: true, sub: { status: 'Pending', isPending: true }, turnedIn: true
    });
    assert.equal(pending, false, 'Saved attendance status wins over stale pending flags');
}
