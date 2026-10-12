const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.route('http://fixture.test/**', route => route.fulfill({ body: '<html><body></body></html>', contentType: 'text/html' }));
        await page.goto('http://fixture.test/student.html');
        await page.addScriptTag({ path: 'js/shared-components.js' });
        for (const role of ['student', 'teacher', 'admin']) {
            const result = await page.evaluate(role => {
                const student = { id: 's1', name: 'Student', section: 'Rizal' };
                const item = { id: 'q1', title: 'Quiz 1', type: 'quiz', selectedQuizId: 'q1', maxScore: 55, maxAttempts: 2 };
                const submission = { studentId: 's1', studentName: 'Student', quizId: 'q1', status: 'Submitted', submittedAt: '2026-10-12T09:00:00Z', score: 50, teacherScore: 50, attemptsUsed: 1, extraAttempts: 1, allowResubmitGranted: true, history: [{ submittedAt: '2026-10-11T09:00:00Z', score: 40 }, { submittedAt: '2026-10-12T09:00:00Z', score: 50 }] };
                window.currentTopicState = { subjectId: 'prog', selectedSection: 'Rizal', selectedStudent: 'Student', topicIdx: 0 };
                window._sharedViewSubmissionMode = true;
                window.getLoggedInStudentUser = () => student;
                window.getUnifiedSectionStudents = () => [student];
                window.getCurrentTopicAssessment = () => item;
                window.getStudentAssessmentSubmission = () => submission;
                window.findAssessmentSubmittedWork = () => submission;
                window.resolveStudentAssessmentSubmissionDetails = () => ({ numericScore: 50, isGraded: true, turnedIn: true, submittedAt: submission.submittedAt });
                window.getEffectiveAssessmentStatusAndScore = () => ({ score: 50, status: 'none' });
                localStorage.setItem('sigma_extra_attempts_s1_prog_0_assessments_0', '1');
                const html = window.renderSharedAssessmentsTabHtml({ assessments: [item], activeIdx: 0, subjectId: 'prog', topicIdx: 0, section: 'Rizal', tab: 'assessments', role });
                return { html, extra: window.getAssessmentExtraAttempts('prog', 0, 'assessments', 0, student, submission), stored: localStorage.getItem('sigma_extra_attempts_s1_prog_0_assessments_0'), score: submission.score };
            }, role);
            assert.doesNotMatch(result.html, /Allow Resubmit|Undo Resubmit|>\s*Resubmit\s*</);
            assert.doesNotMatch(result.html, /submission-attempt-select|\(\+1\)/);
            assert.equal(result.extra, 0);
            assert.equal(result.stored, '0', role);
            assert.equal(result.score, 50);
        }
        console.log('PASS: quizzes clear extra grants and hide resubmission/dropdown in all roles without deleting grades.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
