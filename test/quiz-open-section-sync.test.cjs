const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const context = await browser.newContext();
        await context.route('**/php/api/**', route => route.abort());
        const editor = await context.newPage();
        await editor.goto('http://127.0.0.1:5519/test/release-workspace.html');
        await editor.evaluate(() => {
            const quiz = { id: 'sync-quiz', title: 'Original quiz', totalPoints: 5, questionsCount: 1, questions: [{ question: 'Original prompt', type: 'Essay', points: 5 }] };
            window.saveStoredQuizLibrary([quiz]);
            const attachment = { id: 'material-one', selectedQuizId: quiz.id, category: 'Quiz', title: quiz.title, questions: quiz.questions, section: 'Rizal', releaseDate: '2026-10-12', selectedStudents: ['2222222'] };
            const topic = { assessments: [{ ...attachment }], assignments: [{ ...attachment }], quiz: [{ ...attachment }], performance: [{ id: 'unrelated', title: 'Keep unchanged', points: 20 }] };
            for (const key of ['sigma-admin-subjects', 'sigma-teacher-subjects']) localStorage.setItem(key, JSON.stringify([{ id: 'sync-subject', topics: [topic] }]));
            localStorage.setItem('sigma_custom_assessments_sync-subject', JSON.stringify([attachment]));
            localStorage.setItem('sigma_student_assessment_submissions', JSON.stringify({ '2222222': { sample: { score: 5, answers: { 0: 'Original response' }, questions: quiz.questions } } }));
        });
        const viewers = [];
        for (const role of ['admin', 'teacher']) {
            const page = await context.newPage();
            await page.goto('http://127.0.0.1:5519/test/release-workspace.html');
            await page.evaluate(role => {
                window.currentUser = { role };
                window._quizLibraryServerData = [{ id: 'sync-quiz', title: 'Stale server quiz', totalPoints: 5 }];
                window.DATA = { subjects: JSON.parse(localStorage.getItem(`sigma-${role}-subjects`)) };
                const preview = document.body.appendChild(document.createElement('output'));
                preview.id = 'sync-preview';
                window[role === 'admin' ? 'refreshAdminTopicUIIfVisible' : 'refreshTeacherTopicUIIfVisible'] = () => {
                    const subject = JSON.parse(localStorage.getItem(`sigma-${role}-subjects`))[0];
                    preview.textContent = `${subject.topics[0].assessments[0].selectedQuizTitle}|${window.getStoredQuizLibrary()[0].totalPoints}`;
                };
            }, role);
            viewers.push(page);
        }
        const before = await editor.evaluate(() => localStorage.getItem('sigma_student_assessment_submissions'));
        await editor.evaluate(() => {
            window.saveStoredQuizLibrary([{ id: 'sync-quiz', title: 'Updated quiz', totalPoints: 10, questionsCount: 2, questions: [
                { question: 'Updated prompt', type: 'Essay', points: 5 },
                { question: 'Added prompt', type: 'Essay', points: 5 }
            ] }]);
            localStorage.setItem('sigma_quiz_updated', JSON.stringify({ id: 'sync-quiz', timestamp: Date.now() }));
        });
        for (const page of viewers) {
            await page.waitForFunction(() => document.getElementById('sync-preview').textContent === 'Updated quiz|10');
            assert.equal(await page.evaluate(() => window.DATA.subjects[0].topics[0].quiz[0].questions.length), 2);
            const topic = await page.evaluate(() => window.DATA.subjects[0].topics[0]);
            assert.equal(topic.assignments[0].maxScore, 10);
            assert.equal(topic.assessments[0].releaseDate, '2026-10-12');
            assert.deepEqual(topic.assessments[0].selectedStudents, ['2222222']);
            assert.equal(topic.performance[0].title, 'Keep unchanged');
        }
        assert.equal(await editor.evaluate(() => localStorage.getItem('sigma_student_assessment_submissions')), before);
        assert.equal(await editor.evaluate(() => JSON.parse(localStorage.getItem('sigma_custom_assessments_sync-subject'))[0].questions.length), 2);
        console.log('PASS: shared admin/teacher open-section refresh, stale cache replacement, all quiz buckets, preserved schedules and submissions');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
