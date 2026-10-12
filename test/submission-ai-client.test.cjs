const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.route('http://sigma.test/**', route => route.fulfill({ body: '<button id="evaluate">Evaluate</button><p id="submission-ai-error" hidden></p>', contentType: 'text/html' }));
        await page.goto('http://sigma.test/teacher.html');
        await page.addScriptTag({ path: path.join(__dirname, '../js/submission-ai-client.js') });
        const result = await page.evaluate(async () => {
            const key = 'sigma_sub_test_student1';
            const attempt = { submittedAt: '2026-10-12T10:00:00Z', attemptNumber: 1, score: 7, files: [{ name: 'answer.txt', url: 'data:text/plain,int%20count%20%3D%201%3B' }], comment: 'My comment' };
            const record = { ...attempt, replies: [{ text: 'Keep this' }], history: [structuredClone(attempt)] };
            localStorage.setItem(key, JSON.stringify(record));
            const context = { key, role: 'teacher', studentId: 'student1', submission: record, identity: SigmaSubmissionAi.identity(attempt), title: 'Variables', instructions: 'Declare an integer', maxScore: 10,
                rubric: { name: 'rubric.txt', url: 'data:text/plain,Correct%20declaration%3A%2010%20points' }, files: attempt.files, criteria: [{ id: 'content', title: 'Content and Understanding' }], autoSelect: false, tab: 'assessments', activeIdx: 0 };
            window._sigmaSubmissionAiContext = context;
            const fetchDocument = window.fetch.bind(window);
            let request;
            let calls = 0;
            window.fetch = async (url, options) => {
                if (!String(url).includes('submission_ai.php')) return fetchDocument(url, options);
                calls++;
                request = JSON.parse(options.body);
                return new Response(JSON.stringify({ success: true, score: 9, criteria: [{ id: 'content', title: 'Content and Understanding', description: 'Correct declaration.' }], commentary: [{ term: 'Next Steps', description: 'Explain the initializer.' }], model: 'test', status: 'Success' }), { headers: { 'Content-Type': 'application/json' } });
            };
            const logs = [];
            window.getLoggedInTeacherUser = () => ({ id: 'teacher1' });
            window.SigmaAiLogs = { record: value => logs.push(value) };
            let refreshed = false;
            window.switchTopicTab = () => { refreshed = true; };
            const button = document.querySelector('button');
            await Promise.all([window.evaluateSelectedSubmissionWithAi(button), window.evaluateSelectedSubmissionWithAi(button)]);
            const saved = JSON.parse(localStorage.getItem(key));
            const evaluation = SigmaSubmissionAi.readEvaluation(key);
            // New work arriving while a request is in flight must keep its own grade and files.
            const next = { ...attempt, attemptNumber: 2, submittedAt: '2026-10-12T11:00:00Z', files: [{ name: 'new.txt', url: 'new' }] };
            const updated = { ...saved, ...next, history: [...saved.history, next] };
            localStorage.setItem(key, JSON.stringify(updated));
            SigmaSubmissionAi.save(context, { score: 8, criteria: [], commentary: [], model: 'test' });
            const afterNewWork = JSON.parse(localStorage.getItem(key));
            const newWorkEvaluation = SigmaSubmissionAi.readEvaluation(key);
            window.fetch = async (url, options) => String(url).includes('submission_ai.php')
                ? new Response(JSON.stringify({ success: false, error: 'Provider unavailable' }), { status: 502, headers: { 'Content-Type': 'application/json' } }) : fetchDocument(url, options);
            await window.evaluateSelectedSubmissionWithAi(button);
            const automaticStudent = { ...context, role: 'student', enabled: true, key: 'new-student-attempt', subjectId: 'test', topicIdx: 0, tab: 'assessments', activeIdx: 0 };
            SigmaSubmissionAi.scheduleAutomatic(automaticStudent);
            const beforeQueue = SigmaSubmissionAi.state(automaticStudent);
            SigmaSubmissionAi.queueAfterSubmission('test', 0, 'assessments', 0);
            SigmaSubmissionAi.scheduleAutomatic(automaticStudent);
            await new Promise(resolve => setTimeout(resolve, 50));
            const afterQueue = SigmaSubmissionAi.state(automaticStudent);
            SigmaSubmissionAi.scheduleAutomatic(automaticStudent);
            return { saved, request, calls, evaluation, logs, refreshed, disabled: button.disabled, afterNewWork, newWorkEvaluation,
                failure: document.getElementById('submission-ai-error').textContent, afterFailure: JSON.parse(localStorage.getItem(key)), beforeQueue, afterQueue };
        });
        assert.equal(result.calls, 1);
        assert.equal(result.saved.score, 7);
        assert.equal(result.saved.history[0].score, 7);
        assert.equal(result.saved.comment, 'My comment');
        assert.equal(result.saved.replies[0].text, 'Keep this');
        assert.equal(result.saved.aiSuggestedScore, 9);
        assert.equal(result.evaluation.aiCommentary[0].term, 'Next Steps');
        assert.match(result.request.submissionText, /int count = 1;/);
        assert.match(result.request.rubricText, /Correct declaration/);
        assert.equal(result.logs[0].feature, 'submission_evaluation');
        assert.equal(result.refreshed, true);
        assert.equal(result.disabled, false);
        assert.equal(result.afterNewWork.files[0].name, 'new.txt');
        assert.equal(result.afterNewWork.history[0].aiSuggestedScore, 8);
        assert.equal(result.newWorkEvaluation.aiSuggestedScore, null);
        assert.equal(result.failure, 'Provider unavailable');
        assert.deepEqual(result.afterFailure, result.afterNewWork);
        assert.equal(result.beforeQueue, null);
        assert.equal(result.afterQueue.status, 'failed');
        console.log('PASS: actual document evidence, attempt-scoped suggestions, preserved grades/comments, logs, and duplicate request prevention');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
