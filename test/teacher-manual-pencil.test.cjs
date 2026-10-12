const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/teacher.js'), 'utf8');
const start = source.indexOf('    window.toggleTeacherScoreEditor = function');
const end = source.indexOf('\n    };', start) + 7;
for (const allowed of [true, false]) {
    let opened = false;
    const input = { disabled: false, style: { display: 'none' }, dataset: { isQuiz: '1', hasQuizSubmission: '0', needsSubmission: allowed ? '0' : '1', manualNoSubmission: allowed ? '1' : '0' } };
    const window = { openTeacherScoreEditor: () => { opened = true; } };
    const document = { getElementById: id => id === 'teacher-grading-score-input' ? input : { disabled: false } };
    vm.runInNewContext(source.slice(start, end), { window, document });
    window.toggleTeacherScoreEditor();
    assert.equal(opened, allowed);
}
console.log('PASS: teacher pencil opens unsubmitted no-deadline quizzes but retains deadline locks');
