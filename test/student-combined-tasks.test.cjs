const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/student.js'), 'utf8');
const start = source.indexOf('            const taskRows = assessments.map');
const end = source.indexOf('            scorePanelHtml =', start);
for (const workView of [true, false]) {
    let panel;
    const window = {
        getStudentAssessmentSubmission: (subject, tab, index) => index === 0 ? { files: [{}] } : null,
        studentHasTurnedInWork: row => Boolean(row?.files?.length || row?.submittedAt),
        resolveStudentAssessmentSubmissionDetails: (ass, subject, topic, index) => index === 2 ? { sub: { submittedAt: '2026-10-12', status: 'Pending' } } : null,
        renderSharedTasksPanelHtml: options => { panel = options; return 'tasks'; }
    };
    vm.runInNewContext(source.slice(start, end), {
        window, location: { hash: '' }, assessments: [{ title: 'Submitted task' }, { title: 'Unsubmitted task' }, { title: 'Awaiting review' }],
        studentUser: { id: 'student' }, subjectId: 'prog', topicIdx: 0, studentSec: 'Rizal',
        isSubmissionPage: workView, numDetailIdx: 0, tasksPanelHtml: ''
    });
    assert.equal(panel.title, 'Tasks');
    assert.equal(panel.items.length, 3);
    assert.equal(panel.items[1].status, undefined, 'Navigation has no status subtitles');
    assert.equal(panel.items[1].onClick, 'window.openMaterialTask(1)');
    assert.equal(panel.items[0].onClick, workView ? 'window.openSubmissionTask(0)' : 'window.openMaterialTask(0)');
    assert.equal(panel.items[2].onClick, workView ? 'window.openSubmissionTask(2)' : 'window.openMaterialTask(2)', 'Pending saved work stays in the current tab');
}
console.log('PASS: unified student task list retains all tasks, statuses, and context-aware navigation');
