const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        for (const kind of ['student', 'teacher']) {
            const page = await browser.newPage();
            await page.route('http://sigma.test/**', route => route.fulfill({ body: '<html></html>', contentType: 'text/html' }));
            await page.goto(`http://sigma.test/${kind}.html`);
            await page.setContent('<button class="sigma-analyze-button"><i></i></button><p class="sigma-analysis-status"></p>');
            await page.evaluate(kind => {
                const user = { id: kind + '-1' };
                window.getLoggedInStudentUser = () => kind === 'student' ? user : null;
                window.getLoggedInTeacherUser = () => kind === 'teacher' ? user : null;
                window.score = 82;
                window.SigmaAnnouncements = { showToast: message => { window.lastError = message; } };
                window.getTeacherSectionCards = () => [{ subject: 'Programming', section: 'Rizal' }];
                window.getUnifiedSectionStudents = () => [{ id: 'student-1' }];
                window.getCategoryDetails = category => category === 'ww' ? [{ id: 'task', title: 'Task 1', max: 100, itemIdx: 0 }] : [];
                window.findAssessmentSubmittedWork = () => ({ files: ['test.docx'] });
                window.getGradebookStudentItemScore = () => window.score;
                localStorage.setItem(`sigma-${kind}-analytics-v1:${kind}-1`, JSON.stringify({ usedProvider: false, cards: [{ id: 'old-rule-card' }], generatedCount: 3, processedAreas: {} }));
                window.requests = [];
                window.invalidEvidence = false;
                window.fetch = async (_url, options) => {
                    const payload = JSON.parse(options.body);
                    window.requests.push(payload);
                    const area = payload.snapshot.areas[0];
                    return { ok: true, json: async () => ({ success: true, provider: 'gemini', model: 'gemini-live-test', keyId: 'key-1', keyLabel: 'Gemini Test', status: 'Success',
                        cards: [{ area: area.id, title: 'Review Your Recorded Assessment', icon: 'review', evidenceIds: [window.invalidEvidence ? 'invented-id' : area.records[0].id],
                            analyses: [{ category: 'descriptive', actionLabel: 'Try', context: 'Your recorded assessment score is 82%.', text: 'Review the assessment feedback.' }] }] }) };
                };
            }, kind);
            await page.addScriptTag({ path: path.join(root, 'js/student-analytics.js') });
            if (kind === 'teacher') await page.addScriptTag({ path: path.join(root, 'js/teacher-analytics.js') });
            else await page.evaluate(() => window.SigmaStudentAnalytics.registerArea('submissions', ({ studentId }) => ({ studentId,
                scopes: [{ subjectId: 'Programming', sectionId: 'Rizal' }], records: [{ id: 'task', subjectId: 'Programming', sectionId: 'Rizal', score: window.score, maximumScore: 100,
                    sources: [{ id: 'assessment-results', label: 'Assessment Results' }] }] })));
            await page.addScriptTag({ path: path.join(root, 'js/ai-log-store.js') });
            await page.addScriptTag({ path: path.join(root, 'js/analytics-ai-client.js') });
            assert.equal(await page.evaluate(kind => (kind === 'student' ? window.SigmaStudentAnalytics : window.SigmaTeacherAnalytics).getCards().length, kind), 0, 'Rule-based cards must not be shown as AI-generated');
            assert.equal(await page.evaluate(() => window.requests.length), 0, 'Installing provider does not spend tokens');
            await page.evaluate(kind => (kind === 'student' ? window.SigmaStudentAnalytics : window.SigmaTeacherAnalytics).analyze(), kind);
            assert.equal(await page.evaluate(() => window.requests.length), 1);
            const log = await page.evaluate(() => window.SigmaAiLogs.getRecords()[0]);
            assert.equal(log.model, 'gemini-live-test');
            assert.equal(log.keyLabel, 'Gemini Test');
            assert.equal(log.userId, kind + '-1');
            assert(log.evidenceSources.some(source => source.id === 'assessment-results'));
            assert.equal(log.source.kind, kind);
            const saved = await page.evaluate(kind => JSON.parse(localStorage.getItem(`sigma-${kind}-analytics-v1:${kind}-1`)), kind);
            assert.equal(saved.usedProvider, true);
            assert.equal(saved.cards.length, 1);
            await page.evaluate(kind => (kind === 'student' ? window.SigmaStudentAnalytics : window.SigmaTeacherAnalytics).analyze(), kind);
            assert.equal(await page.evaluate(() => window.requests.length), 1, 'Unchanged evidence does not regenerate');
            await page.evaluate(() => { window.score = 83; window.invalidEvidence = true; });
            await page.evaluate(kind => (kind === 'student' ? window.SigmaStudentAnalytics : window.SigmaTeacherAnalytics).analyze(), kind);
            assert.equal(await page.evaluate(() => window.SigmaAiLogs.getRecords().length), 1, 'Invalid evidence must not become an AI log');
            const after = await page.evaluate(kind => JSON.parse(localStorage.getItem(`sigma-${kind}-analytics-v1:${kind}-1`)), kind);
            assert.deepEqual(after.cards, saved.cards, 'Invalid response preserves prior verified cards');
            await page.close();
        }
        console.log('PASS: student/teacher live adapters, removal of old rule-based display, scoped generation, actual model logs, cited sources, unchanged-data quota guard, invalid-evidence rejection');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
