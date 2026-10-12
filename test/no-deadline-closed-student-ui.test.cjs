const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.route('http://fixture.test/**', route => route.fulfill({ body: '<html><body></body></html>', contentType: 'text/html' }));
        await page.goto('http://fixture.test/student.html');
        await page.addScriptTag({ path: path.join(__dirname, '../js/shared-components.js') });
        const result = await page.evaluate(() => {
            const student = { id: 'test-student', name: 'Test Student', section: 'Rizal' };
            const assessment = { id: 'test-assessment', title: 'Task Test', type: 'assignment', maxScore: 100 };
            window.getLoggedInStudentUser = () => student;
            window.getStudentAssessmentReleaseStatus = () => ({ isLocked: false, isHidden: false, isUnreleased: false });
            window.resolveStudentAssessmentSection = () => 'Rizal';
            window.findAssessmentSubmittedWork = () => null;
            window.getStudentAssessmentSubmission = () => null;
            window.resolveStudentAssessmentSubmissionDetails = () => ({ numericScore: 0, isGraded: true, turnedIn: false, statusName: 'Not Submitted', hasSubmittedQuiz: false });
            window.getEffectiveAssessmentStatusAndScore = () => ({ score: 0, status: '' });
            window.currentTopicState = { selectedSection: 'Rizal', subjectId: 'prog', topicIdx: 0 };
            const key = window.assessmentClosureKey(student, assessment, 'prog', 'Rizal');
            localStorage.setItem('sigma-manual-grade-closures-v1', JSON.stringify({ [key]: { score: 0, closedAt: '2026-10-12T00:00:00Z' } }));
            const score = window.renderSharedAssessmentScorePanelHtml({ ass: assessment, subjectId: 'prog', section: 'Rizal', role: 'student' });
            const body = window.renderSharedAssessmentsTabHtml({ assessments: [assessment], activeIdx: 0, subjectId: 'prog', topicIdx: 0, section: 'Rizal', tab: 'assessments', role: 'student' });
            document.body.innerHTML = score + body;
            return { text: document.body.textContent, actions: document.querySelectorAll('#student-assessment-submit-btn, #student-submit-answer-btn').length };
        });
        assert.equal(result.actions, 0);
        assert.match(result.text, /Your teacher has recorded a grade, and submissions are now closed/);
        assert.match(result.text, /Not Submitted/);
        console.log('PASS: closed student UI retains grade, Not Submitted, closure message, and no submit/start action');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
