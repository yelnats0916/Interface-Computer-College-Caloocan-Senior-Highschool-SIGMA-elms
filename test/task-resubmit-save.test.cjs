const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.route('http://fixture.test/**', route => route.fulfill({ body: '<html><body></body></html>', contentType: 'text/html' }));
        await page.goto('http://fixture.test/student.html');
        await page.addScriptTag({ path: 'js/shared-components.js' });
        const result = await page.evaluate(() => {
            const student = { id: 's1', name: 'Student', section: 'Rizal' };
            const assessment = { id: 'task1', title: 'Task 1', type: 'assignment', maxScore: 100 };
            const previous = { studentId: 's1', section: 'Rizal', status: 'Submitted', submittedAt: '2026-10-12T09:00:00Z', fileName: 'first.txt', files: [{ name: 'first.txt', type: 'txt', url: '' }], attemptsUsed: 1, score: 90 };
            window.getLoggedInStudentUser = () => student;
            window.getCurrentTopicAssessment = () => assessment;
            window.getStudentAssessmentSubmission = (subject, tab, index, topic, item) => typeof item === 'object' ? previous : null;
            window.getStudentSubmissionStorageKey = () => 'sigma_sub_s1_prog_task1';
            window.isAssessmentLateSubmissionAllowed = () => true;
            window.resolveStudentReleaseSection = () => 'Rizal';
            window.currentTopicState = { subjectId: 'prog', topicIdx: 0, selectedSection: 'Rizal' };
            window.showToast = () => {};
            window.getUnifiedSubjectAliases = () => ['prog', 'Computer Programming 1'];
            localStorage.setItem('sigma_extra_attempts_s1_Computer Programming 1_0_assessments_0', '1');
            window.performStudentAssessmentSubmit('prog', 'assessments', 0, [{ name: 'second.txt', url: '', size: 10 }], 2, '', 0, 'task1');
            const saved = JSON.parse(localStorage.getItem('sigma_sub_s1_prog_task1'));
            return { saved, extra: window.getAssessmentExtraAttempts('prog', 0, 'assessments', 0, student, saved) };
        });
        assert.equal(result.saved.attemptsUsed, 2);
        assert.equal(result.saved.history.length, 2);
        assert.equal(result.saved.history[0].fileName, 'first.txt');
        assert.equal(result.saved.history[1].fileName, 'second.txt');
        assert.equal(result.extra, 0);
        console.log('PASS: task resubmit resolves assessment ID, retains first attempt, saves second, and consumes alias grants.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
