const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../js/assessments-page.js'), 'utf8');
function rows(result) {
    const storage = new Map([
        ['sigma_student_enrolled_classes', JSON.stringify([{ id: 'card-prog1', subject: 'Computer Programming 1', section: 'Rizal' }])],
        ['sigma_quiz_result_s1_rizal_quiz1', JSON.stringify(result)]
    ]);
    const window = {
        location: { pathname: '/student.html' }, addEventListener() {},
        getLoggedInStudentUser: () => ({ id: 's1', name: 'Test Student' }),
        getTopicData: () => ({ q1Topics: [{ assignments: [{ id: 'task1', title: 'Task 1', type: 'assignment' }],
            quiz: [{ id: 'quiz1', title: 'Quiz 1 - Basic Syntax', type: 'quiz', points: 20 }] }] })
    };
    vm.runInNewContext(source, { window, console, document: { addEventListener() {}, getElementById() { return null; } },
        localStorage: { getItem: key => storage.get(key) || null, key: index => [...storage.keys()][index], get length() { return storage.size; } } });
    return window.AssessmentsPage.buildAssessmentRows('student').find(row => row.category === 'quiz');
}
const result = { studentId: 's1', studentName: 'Test Student', section: 'Rizal', subjectId: 'card-prog1',
    quizId: 'quiz1', quizTitle: 'Quiz 1 - Basic Syntax', category: 'Quiz', tab: 'assessments',
    activeIdx: 9, topicIdx: 0, status: 'Graded', isPending: false, score: 16, maxScore: 20,
    completedAt: '2026-10-04T01:00:00Z' };
assert.equal(rows(result).score, 16);
assert.equal(rows(result).max, 20);
assert.equal(rows({ ...result, score: 0 }).score, 0);
assert.equal(rows({ ...result, studentId: 's2' }).score, null);
assert.equal(rows({ ...result, section: 'Other' }).score, null);
assert.equal(rows({ ...result, subjectId: 'other' }).score, null);
assert.equal(rows({ ...result, quizId: 'quiz2', activeIdx: 1 }).score, null);
assert.equal(rows({ ...result, status: 'Pending', isPending: true }).score, '--');
console.log('Quiz result lookup tests passed.');
