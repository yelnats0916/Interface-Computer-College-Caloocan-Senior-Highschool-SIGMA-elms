const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const window = {};
let requests = 0;
let queued = 0;
vm.runInNewContext(fs.readFileSync('js/submission-ai-client.js', 'utf8'), {
    window, console,
    fetch: () => { requests++; throw new Error('Quiz must not request AI'); },
    setTimeout: () => { queued++; },
    localStorage: { getItem: () => null, setItem: () => { throw new Error('Quiz must not queue AI'); } }
});
(async () => {
    for (const marker of [{ tab: 'quiz' }, { isQuiz: true }, { submission: { quizId: 'q1' }, tab: 'assessments' }]) {
        const context = { role: 'student', studentId: 's1', mode: 'feedback', ...marker };
        window.SigmaSubmissionAi.scheduleAutomatic(context);
        await window.evaluateSelectedSubmissionWithAi(null, context);
    }
    assert.equal(requests, 0);
    assert.equal(queued, 0);
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.route('http://fixture.test/**', route => route.fulfill({ body: '<html><body></body></html>', contentType: 'text/html' }));
        await page.goto('http://fixture.test/student.html');
        await page.addScriptTag({ path: 'js/shared-components.js' });
        const result = await page.evaluate(() => {
            window.getLoggedInStudentUser = () => ({ id: 's1', name: 'Student', section: 'Rizal' });
            window.getStudentAssessmentReleaseStatus = () => ({ isLocked: false, isHidden: false, isUnreleased: false });
            window.currentTopicState = { subjectId: 'prog', selectedSection: 'Rizal', topicIdx: 0 };
            window.SigmaSubmissionAi = { readEvaluation: () => null, scheduleAutomatic: context => { if (context) throw new Error('Quiz queued AI'); }, readFeedback: () => { throw new Error('Quiz read cached feedback'); } };
            const item = { id: 'q1', title: 'Quiz 1', category: 'quiz', type: 'quiz', selectedQuizId: 'q1', maxScore: 100 };
            const html = window.renderSharedAssessmentsTabHtml({ assessments: [item], subjectId: 'prog', section: 'Rizal', role: 'student', activeIdx: 0, topicIdx: 0, tab: 'assessments' });
            return { html, context: window._sigmaSubmissionFeedbackContext };
        });
        assert.doesNotMatch(result.html, /SIGMA AI Feedback/);
        assert.equal(result.context, null);
    } finally { await browser.close(); }
    console.log('PASS: quiz commentary does not queue or send AI requests.');
})().catch(error => { console.error(error); process.exitCode = 1; });
