const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/shared-components.js'), 'utf8');
const start = source.indexOf('window.openGradebookAssessment = function');
const handler = source.slice(start, source.indexOf('\n};', start) + 4);
for (const portal of ['teacher', 'admin']) {
    const task = { id: 'task-1', title: 'Same title' };
    const quiz = { id: 'quiz-1', title: 'Same title' };
    const calls = [];
    const window = {
        sigmaGradesState: { activeQuarter: 2, selectedStudent: 'Selected Student', selectedSubjectSection: { subject: 'prog1', sectionName: 'Rizal' } },
        getCategoryDetails(category, quarter, subject, section) {
            assert.equal(quarter, 2);
            assert.equal(subject, 'prog1');
            assert.equal(section, 'Rizal');
            return [{ ...(category === 'quiz' ? quiz : task), subjectId: 'card-prog1', topicIdx: 3, topicItemIdx: 0, itemIdx: 0 }];
        },
        getUnifiedTopicAssessments(tab, subject, topic, defaults, section) {
            assert.equal(tab, 'assessments');
            assert.equal(subject, 'card-prog1');
            assert.equal(topic, 3);
            assert.equal(section, 'Rizal');
            return [task, quiz];
        },
        openTopicContent: (...args) => calls.push(args)
    };
    vm.runInNewContext(handler, { window });
    const portalSource = fs.readFileSync(path.join(__dirname, `../js/${portal}.js`), 'utf8');
    const begin = portalSource.indexOf('window.navigateToAssessmentFromGradebook = function');
    const finish = portalSource.indexOf('};', begin) + 2;
    vm.runInNewContext(portalSource.slice(begin, finish), { window });
    window.navigateToAssessmentFromGradebook('assignment', 0);
    window.navigateToAssessmentFromGradebook('quiz', 0, 'prog1', 'Rizal');
    assert.equal(calls[0][3], 0);
    assert.equal(calls[1][3], 1, 'Quiz uses its combined-list position, not the task position');
    assert.equal(calls[1][0], 'card-prog1');
    assert.equal(calls[1][1], 3);
    assert.equal(calls[1][5].viewSubmission, true);
    assert.equal(calls[0][5].viewSubmission, true, 'Task without submitted work still opens Submissions');
    assert.equal(calls[0][5].selectedStudent, 'Selected Student');
    assert.equal(calls[1][5].selectedSection, 'Rizal');
    window.navigateToAssessmentFromGradebook('quiz', 99);
    assert.equal(calls.length, 2, 'Unknown column must not open another assessment');
    window.getUnifiedTopicAssessments = () => [task];
    window.navigateToAssessmentFromGradebook('quiz', 0);
    assert.equal(calls.length, 2, 'Missing material must not fall back to a similarly named task');
}
assert(fs.readFileSync(path.join(__dirname, '../js/sigma-analytics.js'), 'utf8').includes('name="insight-search"'));
console.log('PASS: teacher/admin assessment clicks, scoped routing, task/quiz identity, stale columns, search field name');
