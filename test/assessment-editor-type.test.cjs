const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

for (const file of ['curriculum-release.js', 'teacher.js']) {
    const source = fs.readFileSync(path.join(__dirname, '../js', file), 'utf8');
    const start = source.indexOf('            const foundType =', source.indexOf('let isScheduleQuiz = false;'));
    const end = source.indexOf("            if (foundType === 'activity'", start);
    const classify = item => {
        const context = { foundAss: item, activeSelectedItem: item, targetTitle: item.title, effectiveId: 'assessment-2', currentTopicState: { activeTab: 'assessments' }, isScheduleQuiz: false };
        vm.runInNewContext(source.slice(start, end), context);
        return context.isScheduleQuiz;
    };
    assert.equal(classify({ type: 'assignment', title: 'Task 2 - Basic Syntax and Data Types Quiz' }), false, file);
    assert.equal(classify({ type: 'task', title: 'Practice Quiz' }), false, file);
    assert.equal(classify({ type: 'quiz', title: 'Basic Syntax' }), true, file);
    assert.equal(classify({ type: 'assignment', title: 'Digital assessment', selectedQuizId: 'quiz-1' }), true, file);
}
console.log('PASS: task titles do not override assessment types; actual and linked quizzes retain quiz settings');
