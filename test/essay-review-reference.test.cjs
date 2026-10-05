const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/shared-components.js'), 'utf8');
const start = source.indexOf("        } else if (qType === 'Essay' || qType === 'Paragraph') {");
const end = source.indexOf("        } else {\n            const rawChoices", start);
assert.ok(start >= 0 && end > start);
const branch = source.slice(source.indexOf('\n', start) + 1, end);
for (const pending of [true, false]) {
    for (const isTeacherUser of [true, false]) {
        const context = vm.createContext({
            _isReviewMode: true, _isTeacherPreviewMode: false, _showCorrectAnswers: false,
            isTeacherUser, isAutoScoring: false, idx: 2, pts: 10,
            q: {}, curAns: 'Student essay', bodyHtml: '',
            isQuestionPendingReview: index => { assert.equal(index, 2); return pending; },
            escapeStr: value => value,
            renderTeacherScoringPanelHtml: () => 'SCORING_PANEL',
            window: {
                _activeReviewSubData: { essayGradingMode: 'manual', essayScores: { 2: 8 } },
                readAcceptedQuestionScore: scores => scores[2],
                questionScoreAccepted: () => !pending
            }
        });
        vm.runInContext(`(() => { ${branch} })()`, context);
        assert.ok(context.bodyHtml.includes('Student essay'));
        assert.equal(context.bodyHtml.includes('SCORING_PANEL'), isTeacherUser || pending);
        assert.equal(context.bodyHtml.includes('Graded'), !pending);
    }
}
console.log('PASS: essay review renders for student/teacher, pending/graded states without undefined references');
