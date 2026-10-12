const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
        await page.route('http://fixture.test/**', route => route.fulfill({ body: '<html></html>', contentType: 'text/html' }));
        await page.goto('http://fixture.test/teacher.html');
        for (const match of fs.readFileSync(path.join(__dirname, '../teacher.html'), 'utf8').matchAll(/href="(css\/[^"?]+\.css)/g)) {
            await page.addStyleTag({ path: path.join(__dirname, '..', match[1]) });
        }
        await page.addScriptTag({ path: path.join(__dirname, '../js/shared-components.js') });
        await page.addScriptTag({ path: path.join(__dirname, '../js/submission-ai-client.js') });
        await page.evaluate(() => {
            window._studentViewSubmissionMode = true;
            const student = { id: 'student1', name: 'Test Student' };
            window.getUnifiedSectionStudents = () => [student];
            window.resolveRosterStudent = () => student;
            const attempt = { attemptNumber: 1, submittedAt: '2026-10-12T10:00:00Z', files: [{ name: 'work.txt', url: 'data:text/plain,int%20count%20%3D%201%3B' }], score: 7 };
            const submission = { ...attempt, history: [structuredClone(attempt)], studentId: 'student1' };
            window.getStudentAssessmentSubmission = () => submission;
            window.getStudentSubmissionStorageKey = () => 'fixture-sub';
            localStorage.setItem('fixture-sub', JSON.stringify(submission));
            const assessment = { id: 'task1', title: 'Variables', type: 'assignment', aiAssisted: true, isTeacher: true, authorRole: 'Teacher',
                rubricFileName: 'rubric.txt', rubricUrl: 'data:text/plain,Correct%20declaration%3A%2010%20points', maxScore: 10, instructions: 'Declare a variable.' };
            function paint() {
                const html = window.renderSharedAssessmentsTabHtml({ tab: 'assessments', assessments: [assessment], activeIdx: 0, subjectId: 'test', topicIdx: 0, role: 'teacher', section: 'Rizal', selectedStudent: 'student1' });
                document.body.innerHTML = `<div id="section-topic-content"><div class="teacher-topic-page-grid is-detail-view"><div id="topic-content-main">${html}</div><div id="topic-right-section" class="teacher-topic-progress-rail"></div></div></div>`;
                window.relocateAssessmentPrimaryAction(document.body);
            }
            window.switchTopicTab = paint;
            const readFile = window.fetch.bind(window);
            window.fetch = async (url, options) => {
                if (!String(url).includes('submission_ai.php')) return readFile(url, options);
                window.evaluationRequests = (window.evaluationRequests || 0) + 1;
                const evidence = JSON.parse(options.body);
                return new Response(JSON.stringify({ success: true, score: 9, criteria: [{ ...evidence.criteria[0], description: 'The declaration uses the correct integer type and initializer.' }],
                    commentary: [{ term: 'Next Steps', description: 'Explain how the initializer sets the starting value.' }], model: 'test', status: 'Success' }), { headers: { 'Content-Type': 'application/json' } });
            };
            paint();
        });
        await page.getByText('Explain how the initializer sets the starting value.', { exact: false }).waitFor();
        assert.match(await page.locator('#teacher-ai-assistance-panel').innerText(), /9 \/ 10/);
        assert.match(await page.locator('#teacher-ai-assistance-panel').innerText(), /1 Criterion.*Evaluated/);
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('fixture-sub')).score), 7);
        assert.equal(await page.locator('[onclick*="evaluateSelectedSubmissionWithAi"]').count(), 0);
        await page.evaluate(() => { window.switchTopicTab(); window.switchTopicTab(); });
        await page.waitForTimeout(100);
        assert.equal(await page.evaluate(() => window.evaluationRequests), 1);
        await page.screenshot({ path: path.join(process.env.TEMP, 'submission-ai-connected-desktop.png'), fullPage: true });
        await page.setViewportSize({ width: 375, height: 667 });
        await page.screenshot({ path: path.join(process.env.TEMP, 'submission-ai-connected-mobile.png'), fullPage: true });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        console.log('PASS: real assessment panel evaluates, refreshes score/criteria/commentary, preserves official grade, and fits mobile');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
