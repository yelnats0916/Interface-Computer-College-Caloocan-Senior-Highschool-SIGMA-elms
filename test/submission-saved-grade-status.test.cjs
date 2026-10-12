const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/shared-components.js'), 'utf8');
const start = source.indexOf('        isGraded = Boolean(', source.indexOf('window.renderSharedAssessmentsTabHtml'));
const end = source.indexOf('        const hasUnusedGrantedExtraAttempt', start);
assert.ok(start >= 0 && end > start);
function resolve(subData, overrides = {}) {
    const context = {
        subData, effectiveGrading: null, isSubmitted: true, isAnyQuiz: false,
        genuineAttemptsCount: 1, subScoreVal: subData?.score ?? null, gbScore: null,
        role: 'student', ass: {}, isGraded: false, isPending: false,
        window: {}, studentUser: { id: '2222222' }, submissionAssessment: { section: 'Rizal' },
        subjectId: 'prog1', topicIdx: 0, activeIdx: 0, ...overrides
    };
    vm.runInNewContext(source.slice(start, end), context);
    return { graded: context.isGraded, pending: context.isPending };
}
const saved = { score: 90, teacherSaved: true, isPending: true, status: 'Incomplete', submittedAt: '2026-10-03' };
const before = JSON.stringify(saved);
assert.deepEqual(resolve(saved), { graded: true, pending: false });
assert.equal(JSON.stringify(saved), before, 'Rendering must not rewrite or duplicate stored grades');
assert.deepEqual(resolve({ ...saved, score: 0 }), { graded: true, pending: false });
assert.deepEqual(resolve({ ...saved, teacherSaved: false, teacherEditedScore: true }), { graded: true, pending: false });
assert.deepEqual(resolve({ ...saved, teacherSaved: false }), { graded: false, pending: true });
assert.deepEqual(resolve({ ...saved, score: '' }), { graded: false, pending: true });
assert.deepEqual(resolve(saved, { isSubmitted: false }), { graded: false, pending: true });
assert.deepEqual(resolve(saved, { isAnyQuiz: true, genuineAttemptsCount: 0 }), { graded: false, pending: false });
console.log('PASS: saved teacher grades override stale pending flags; zero, unsaved reviews and quiz attempts stay correct');
const gradebookContext = {
    window: { resolveStudentAssessmentSubmissionDetails: () => ({ isGraded: true, numericScore: 90 }) },
    studentUser: { id: '2222222' }, submissionAssessment: { section: 'Rizal' }, subjectId: 'prog1', topicIdx: 0, activeIdx: 0,
    subData: { status: 'Pending', isPending: true, submittedAt: '2026-10-03' },
    effectiveGrading: null, isSubmitted: true, isAnyQuiz: false, genuineAttemptsCount: 1,
    subScoreVal: null, gbScore: null, role: 'student', ass: {}, isGraded: false, isPending: false
};
vm.runInNewContext(source.slice(start, end), gradebookContext);
assert.equal(gradebookContext.isGraded, true, 'Details recognize the same gradebook-only saved score as the score panel');
assert.equal(gradebookContext.isPending, false);
assert.equal(gradebookContext.gbScore, 90);
