const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const studentSource = fs.readFileSync(path.join(__dirname, '../js/student.js'), 'utf8');
const loginStart = studentSource.indexOf('    function getLoggedInStudentUser() {');
const loginEnd = studentSource.indexOf('    window.getLoggedInStudentUser = getLoggedInStudentUser;', loginStart);
const loginHelper = studentSource.slice(loginStart, loginEnd);

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.route('**/php/api/**', route => route.abort());
        await page.goto('http://127.0.0.1:5519/test/release-workspace.html');
        async function prepare(seed = false) {
            await page.waitForFunction(() => window.openStudentQuizReviewPlayer && window.quizFileCopyKey);
            await page.evaluate(seed => {
                const student = { id: 'review-student', name: 'Review Student', section: 'Fixture Section' };
                const questions = [
                    { id: 17000001, type: 'Multiple Choice', question: 'Which type stores true or false?', choices: ['Boolean', 'Integer'], answer: 'Boolean', correctAnswer: 'Boolean', points: 30 },
                    { id: 17000002, type: 'Short Answer', question: 'Name a text data type.', answers: ['String'], answer: 'String', points: 25 },
                    { id: 17000003, type: 'Essay', question: 'Explain a data type.', points: 0 }
                ];
                const quiz = { id: 'review-quiz', quizId: 'review-quiz', selectedQuizId: 'review-quiz', category: 'Quiz', type: 'Quiz', title: 'Review Quiz', questions, section: 'Grade 11 - Fixture Section', maxScore: 55 };
                window.currentUser = { ...student, role: 'student' };
                window.loggedTeacher = null;
                window.currentTopicState = { subjectId: 'review-subject', selectedSection: student.section, selectedStudent: 'All' };
                window.getLoggedInStudentUser = () => student;
                window.reviewAccountFixture = { id: 'account-row-42', uid: student.id, firstName: 'Review', lastName: 'Student', fullName: student.name, section: 'Grade 11 - Fixture Section' };
                window.getUnifiedSectionStudents = () => [{ ...window.reviewAccountFixture, name: 'Student, Review' }];
                sessionStorage.setItem('sigma-authenticated-user', JSON.stringify({ id: student.id, role: 'Student', fullName: student.name }));
                window.getStudentActiveAssessmentDetails = () => quiz;
                window.getCurrentTopicAssessment = () => quiz;
                window.findStoredQuizFile = () => quiz;
                window.findLibraryQuizFile = () => quiz;
                window.getStudentAssessmentReleaseStatus = () => ({ isLocked: false, isHidden: false, isUnreleased: false });
                window.renderReviewFilePanelFixture = () => {
                    window._studentViewSubmissionMode = true;
                    const root = document.getElementById('review-file-panel-fixture') || document.body.appendChild(document.createElement('div'));
                    root.id = 'review-file-panel-fixture';
                    root.innerHTML = window.renderSharedAssessmentsTabHtml({ subjectId: 'review-subject', topicIdx: 0, tab: 'assessments', activeIdx: 0, assessments: [quiz], role: 'student', section: 'Fixture Section' });
                };
                window.getAssessmentReleaseConfig = () => ({ assessmentShowCorrectAnswers: { 'review-quiz': true } });
                window.persistReviewTotalToScorePanel = () => { throw new Error('Student review must not persist a score'); };
                if (seed) {
                    const copy = {
                        studentId: student.id, studentName: student.name, section: student.section, subjectId: 'review-subject',
                        quizId: quiz.quizId, title: quiz.title, questions, score: 55, status: 'Graded',
                        attempts: [
                            { attemptNumber: 1, submittedAt: '2026-10-01T08:00:00', score: 20, status: 'Graded', questions, answers: { 17000001: 'Integer', 17000002: 'Old response', 17000003: 'Earlier essay' } },
                            { attemptNumber: 2, submittedAt: '2026-10-02T08:00:00', score: 0, status: 'Graded', questions, answers: { 17000001: 'Boolean', 17000002: 'String', 17000003: 'Submitted essay' } }
                        ]
                    };
                    localStorage.setItem('review-grade-fixture', JSON.stringify({ ...copy, questions: undefined, attempts: undefined, answers: {} }));
                    localStorage.setItem('sigma_student_assessment_submissions', JSON.stringify({ [student.id]: { 'review-subject_0_assessments_0': { ...copy, teacherSaved: true, essayScores: { 'qidx:2': 0 }, questions: undefined, attempts: undefined, answers: {} } } }));
                    localStorage.setItem(window.quizFileCopyKey(student.id, student.section, 'review-subject', quiz.quizId), JSON.stringify({ ...copy, answers: {}, questions: undefined, attempts: undefined }));
                    localStorage.setItem(window.quizFileCopyKey(student.id, student.section, 'review-subject', quiz.title), JSON.stringify(copy));
                }
            }, seed);
            await page.addScriptTag({ content: `(function () { const USER_STORAGE_KEY='review-account-fixture'; const getStoredJson=(key,fallback)=>key===USER_STORAGE_KEY?[window.reviewAccountFixture]:window.getStoredJson(key,fallback); ${loginHelper} window.getLoggedInStudentUser=getLoggedInStudentUser; })();` });
            assert.equal(await page.evaluate(() => window.getLoggedInStudentUser().uid), 'review-student');
        }
        await prepare(true);
        const before = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(key => key.startsWith('sigma_student_quiz_file_') || key === 'review-grade-fixture').map(key => [key, localStorage.getItem(key)]))));
        for (const refresh of [false, true]) {
            await page.setViewportSize({ width: refresh ? 390 : 1200, height: 844 });
            if (refresh) { await page.reload(); await prepare(); }
            await page.evaluate(() => {
                window.renderReviewFilePanelFixture();
                window.originalReviewSubmissionLookup = window.getStudentAssessmentSubmission;
                window.originalReviewAssessmentLookup = window.getStudentActiveAssessmentDetails;
                window.getStudentAssessmentSubmission = () => null;
                window.getStudentActiveAssessmentDetails = () => null;
            });
            await page.locator('#review-file-panel-fixture').getByRole('button', { name: 'View Quiz Score', exact: true }).click();
            assert.match(await page.locator('#uqp-counter').innerText(), /55\/55/);
            assert.equal(await page.locator('#uqp-counter .sigma-quiz-total').innerText(), 'Total Points: 55/55');
            assert.equal(await page.locator('#uqp-counter .sigma-quiz-question-points').innerText(), '30 Points');
            const essayPill = page.locator('button[onclick="window.jumpToQuizPreviewQuestion(2)"]');
            assert.equal(await essayPill.evaluate(el => getComputedStyle(el).borderRadius), '50%', 'Review uses the shared circular question buttons');
            assert.equal(await essayPill.evaluate(el => el.classList.contains('bg-amber-100')), false, 'Graded student essays must not show a pending yellow badge');
            await essayPill.click();
            assert.equal(await essayPill.evaluate(el => el.classList.contains('bg-[#FFD000]')), true, 'Selected question stays yellow');
            assert.doesNotMatch(await page.locator('#uqp-counter').innerText(), /Pending Review/);
            await page.evaluate(() => window.jumpToQuizPreviewQuestion(0));
            await page.evaluate(() => {
                window.getStudentAssessmentSubmission = window.originalReviewSubmissionLookup;
                window.getStudentActiveAssessmentDetails = window.originalReviewAssessmentLookup;
            });
            await page.evaluate(() => window.openStudentQuizReviewPlayer('review-subject', 'assessments', 0, 0, encodeURIComponent('Review Quiz'), 1));
            assert.match(await page.locator('#uqp-counter').innerText(), /55\/55/);
            assert.equal(await page.locator('#universal-quiz-preview-modal .fa-circle-check').count() > 0, true);
            await page.screenshot({ path: path.join(os.tmpdir(), `sigma-quiz-review-${refresh ? 'mobile' : 'desktop'}.png`) });
            await page.locator('#uqp-next-btn').click();
            assert.equal(await page.locator('#uqp-short-answer-1').inputValue(), 'String');
            await page.evaluate(() => window.openStudentQuizReviewPlayer('review-subject', 'assessments', 0, 0, encodeURIComponent('Review Quiz'), 2));
            assert.match(await page.locator('#uqp-counter').innerText(), /20\/55/);
            assert.equal(await page.locator('#universal-quiz-preview-modal .fa-circle-xmark').count() > 0, true);
            await page.locator('#uqp-next-btn').click();
            assert.equal(await page.locator('#uqp-short-answer-1').inputValue(), 'Old response');
            await page.evaluate(() => {
                window.currentUser.role = 'teacher';
                window.loggedTeacher = { id: 'teacher-fixture' };
                window.currentTopicState.selectedStudent = 'Student, Review';
                window.openStudentQuizReviewPlayer('review-subject', 'assessments', 0, 0, encodeURIComponent('Review Quiz'), 1);
            });
            assert.match(await page.locator('#uqp-counter').innerText(), /55\/55/);
            assert.equal(await page.locator('#universal-quiz-preview-modal .fa-circle-check').count() > 0, true);
            await page.locator('#uqp-next-btn').click();
            assert.equal(await page.locator('#uqp-short-answer-1').inputValue(), 'String');
            assert.equal(await essayPill.evaluate(el => el.classList.contains('bg-amber-100')), false, 'Teacher must restore official accepted essay scores');
            await essayPill.click();
            assert.match(await page.locator('#uqp-body').innerText(), /Earned: 0 points/);
            await page.getByRole('button', { name: 'Edit score for question 3', exact: true }).click();
            assert.equal(await page.locator('#uqp-essay-score-2').inputValue(), '0', 'An accepted zero score must survive reopening and refresh');
            assert.doesNotMatch(await page.locator('#uqp-counter').innerText(), /Pending Review/);
            const after = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(key => key.startsWith('sigma_student_quiz_file_') || key === 'review-grade-fixture').map(key => [key, localStorage.getItem(key)]))));
            assert.equal(after, before, 'Review must not change saved answers or grades');
        }
        await page.evaluate(() => {
            window.openAskingPanel = options => options.onConfirm();
            window.acceptTeacherEssayPoints(2, 0);
        });
        assert.match(await page.locator('#uqp-counter').innerText(), /55\/55/);
        await page.evaluate(() => window.finalizeTeacherReviewDone());
        const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('sigma_student_assessment_submissions'))['review-student']);
        assert.equal(Object.values(saved).some(record => record.score === 55 && record.essayScores?.['qidx:2'] === 0 && record.status === 'Graded'), true);
        await page.reload();
        await prepare();
        await page.evaluate(() => {
            window.currentUser.role = 'teacher';
            window.loggedTeacher = { id: 'teacher-fixture' };
            window.currentTopicState.selectedStudent = 'Student, Review';
            window.openStudentQuizReviewPlayer('review-subject', 'assessments', 0, 0, encodeURIComponent('Review Quiz'), 1);
            window.jumpToQuizPreviewQuestion(2);
        });
        assert.match(await page.locator('#uqp-counter').innerText(), /55\/55/);
        assert.doesNotMatch(await page.locator('#uqp-counter').innerText(), /Pending Review/);
        await page.getByRole('button', { name: 'Edit score for question 3', exact: true }).click();
        assert.equal(await page.locator('#uqp-essay-score-2').inputValue(), '0');
        console.log('PASS: real login UID, roster-name teacher selection, matching student/teacher answers and scores, normalized sections, attempts, refresh, read-only persistence');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
