const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.route('http://fixture.test/**', route => route.fulfill({ body: '<html><body></body></html>', contentType: 'text/html' }));
        await page.goto('http://fixture.test/admin.html');
        await page.addScriptTag({ path: path.join(__dirname, '../js/shared-components.js') });
        for (const role of ['teacher', 'admin']) {
            for (const maxAttempts of [1, 2]) {
                const result = await page.evaluate(({ role, maxAttempts }) => {
                    const assessment = { id: 'test-task', title: 'Test Task', type: 'assignment', maxScore: 100, maxAttempts, aiAssisted: true };
                    const submission = { status: 'Submitted', submittedAt: '2026-10-12T09:57:00Z', fileName: 'answer.txt', score: 90, teacherScore: 90, attemptsUsed: 1 };
                    window.currentTopicState = { subjectId: 'prog', selectedSection: 'Rizal', selectedStudent: 'Test Student', topicIdx: 0 };
                    window._sharedViewSubmissionMode = true;
                    window.getUnifiedSectionStudents = () => [{ id: 'test-student', name: 'Test Student' }];
                    window.getStudentAssessmentSubmission = () => submission;
                    window.findAssessmentSubmittedWork = () => submission;
                    window.resolveStudentAssessmentSubmissionDetails = () => ({ numericScore: 90, isGraded: true, turnedIn: true, submittedAt: submission.submittedAt });
                    window.getEffectiveAssessmentStatusAndScore = () => ({ score: 90, status: 'none' });
                    document.body.innerHTML = window.renderSharedAssessmentsTabHtml({ assessments: [assessment], activeIdx: 0, subjectId: 'prog', topicIdx: 0, section: 'Rizal', tab: 'assessments', role });
                    const badge = document.querySelector('.assessment-closed-badge');
                    const action = document.querySelector('.sigma-resubmit-action-btn');
                    const result = { badges: document.querySelectorAll('.assessment-closed-badge').length, lock: !!document.querySelector('.assessment-closed-badge .fa-lock'), sameRow: !!badge && badge.parentElement === action?.parentElement?.parentElement };
                    window._sharedViewSubmissionMode = false;
                    window._studentViewSubmissionMode = false;
                    document.body.innerHTML = window.renderSharedAssessmentsTabHtml({ assessments: [assessment], activeIdx: 0, subjectId: 'prog', topicIdx: 0, section: 'Rizal', tab: 'assessments', role });
                    const details = document.querySelector('.assessment-submission-details-card');
                    result.materials = details?.textContent;
                    result.materialsBadges = details?.querySelectorAll('.assessment-closed-badge').length;
                    result.materialsAi = !!document.querySelector('#toggle-ai-assistance-card-btn, #teacher-ai-assistance-panel') || document.body.textContent.includes('SIGMA AI Feedback');
                    result.materialsAiContext = window._sigmaSubmissionAiContext;
                    result.materialsFeedbackContext = window._sigmaSubmissionFeedbackContext;
                    window._sharedViewSubmissionMode = true;
                    window.getStudentAssessmentSubmission = () => null;
                    window.findAssessmentSubmittedWork = () => null;
                    window.resolveStudentAssessmentSubmissionDetails = () => ({ numericScore: null, isGraded: false, turnedIn: false });
                    window.getEffectiveAssessmentStatusAndScore = () => ({ score: null, status: 'none' });
                    document.body.innerHTML = window.renderSharedAssessmentsTabHtml({ assessments: [assessment], activeIdx: 0, subjectId: 'prog', topicIdx: 0, section: 'Rizal', tab: 'assessments', role });
                    result.emptySubmissionAi = !!document.querySelector('#toggle-ai-assistance-card-btn, #teacher-ai-assistance-panel') || document.body.textContent.includes('SIGMA AI Feedback');
                    return result;
                }, { role, maxAttempts });
                assert.equal(result.badges, maxAttempts === 1 ? 1 : 0, `${role}: limit ${maxAttempts}`);
                assert.equal(result.lock, maxAttempts === 1);
                if (maxAttempts === 1) assert.equal(result.sameRow, true, `${role}: badge and resubmit share a row`);
                assert.equal(result.materialsBadges, 0, `${role}: Materials has no student closure badge`);
                assert.match(result.materials, /Max Attempts/);
                assert.match(result.materials, /Late Permission/);
                assert.doesNotMatch(result.materials, /Attempts Used|Submitted|Graded|Resubmit/);
                assert.equal(result.materialsAi, false, `${role}: Materials hides AI toggle and both panels`);
                assert.equal(result.materialsAiContext, null);
                assert.equal(result.materialsFeedbackContext, null);
                assert.equal(result.emptySubmissionAi, false, `${role}: no submission hides AI`);
            }
        }
        console.log('PASS: teacher/admin share closed badge at attempt limit, not below limit.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
