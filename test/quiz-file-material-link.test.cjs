const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/shared-components.js'), 'utf8');
assert.match(source, /matItem\.quizId \|\| matItem\.selectedQuizId/);
assert.match(source, /const hasRealSubmittedAttemptFiles = !hasAttachedDigitalQuiz/);
assert.match(source, /targetQuizId && submissionHasUploadedFile && !submissionHasQuizIdentity/);
assert.match(source, /hasNonQuizUpload && !hasQuizAttempt/);
assert.match(source, /Do not leave an unsubmitted quiz on a stale submission URL/);

const start = source.indexOf('window.submissionMatchesAssessment = function');
const end = source.indexOf('window.getAssessmentGradeStorageKeys = function', start);
const vm = require('node:vm');
const context = vm.createContext({ window: {
    getAssessmentMatchIdentity: item => ({
        materialId: String(item.id || '').toLowerCase(),
        quizId: String(item.selectedQuizId || item.quizId || '').toLowerCase(),
        title: String(item.title || '').toLowerCase(),
        titleBase: String(item.title || '').toLowerCase(),
        topicIdx: 0, topicItemIdx: 1, hasAttachedQuiz: Boolean(item.selectedQuizId || item.quizId)
    })
} });
vm.runInContext(source.slice(start, end), context);
const quizMaterial = { id: 'quiz-material-1', selectedQuizId: 'QZ-9301', title: 'Quiz 1 - Basic Syntax and Data Types' };
const taskPdf = { id: 'task-1', materialId: 'task-1', title: 'Task 1 - Variable Declaration Practice', type: 'assignment', files: [{ name: 'IAS(DP)_04PT01.pdf' }] };
const quizAttempt = { quizId: 'QZ-9301', title: 'Quiz 1 - Basic Syntax and Data Types', answers: { 0: 'Boolean' } };
assert.equal(context.window.submissionMatchesAssessment(taskPdf, quizMaterial), false);
assert.equal(context.window.submissionMatchesAssessment(quizAttempt, quizMaterial), true);
console.log('PASS: quiz material uses its attached quiz and rejects task PDF submissions');
