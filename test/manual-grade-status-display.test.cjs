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
