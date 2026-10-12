const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        const context = await browser.newContext();
        await context.route('http://sigma.test/**', route => route.fulfill({ body: '<html></html>' }));
        const writer = await context.newPage(), reader = await context.newPage();
        for (const page of [writer, reader]) {
            await page.goto('http://sigma.test/');
            await page.addScriptTag({ path: path.join(__dirname, '..', 'js/ai-log-store.js') });
            await page.evaluate(() => { window.updates = 0; addEventListener('sigma:ai-logs-updated', () => window.updates++); });
        }
        assert.deepEqual(await reader.evaluate(() => SigmaAiLogs.getRecords()), []);
        await writer.evaluate(() => SigmaAiLogs.record({ id: 'real-request', userId: 's1', feature: 'sigmabot', prompt: 'Question', response: 'Answer', model: 'Provider model', status: 'Success', timestamp: '2026-10-10T04:30:00Z' }));
        await reader.waitForFunction(() => window.updates > 0);
        assert.equal(await reader.evaluate(() => SigmaAiLogs.getRecords().length), 1);
        await reader.reload();
        await reader.addScriptTag({ path: path.join(__dirname, '..', 'js/ai-log-store.js') });
        assert.equal(await reader.evaluate(() => SigmaAiLogs.getRecords()[0].response), 'Answer');
        await writer.evaluate(() => SigmaAiLogs.record({ id: 'real-request', userId: 's1', feature: 'sigmabot', timestamp: '2026-10-10T04:30:00Z', status: 'Failed' }));
        assert.equal(await writer.evaluate(() => SigmaAiLogs.getRecords().length), 1);
        assert.equal(await writer.evaluate(() => { try { SigmaAiLogs.record({ userId: 's1', feature: 'invalid' }); return false; } catch { return true; } }), true);
        await writer.evaluate(() => {
            document.body.innerHTML = '<section id="audit-ai-view"></section>';
            localStorage.setItem('sigma-admin-users', JSON.stringify([{ uid: 's1', role: 'Master Admin' }, { uid: 's2', role: 'Teacher' }]));
        });
        await writer.evaluate(() => SigmaAiLogs.setSampleRecords([{ id: 'preview-0', userId: 's1', feature: 'sigmabot', model: 'Sample model', timestamp: '2026-10-10T04:00:00Z' }]));
        assert.equal(await writer.evaluate(() => SigmaAiLogs.getDisplayRecords().length), 1, 'Samples never enter the real AI tables');
        const realBeforeCleanup = await writer.evaluate(() => localStorage.getItem('sigma-ai-recorded-logs'));
        await writer.addScriptTag({ path: path.join(__dirname, '..', 'js/ai-log-preview.js') });
        assert.equal(await writer.evaluate(() => localStorage.getItem('sigma-ai-preview-logs')), null);
        assert.equal(await writer.evaluate(() => localStorage.getItem('sigma-ai-recorded-logs')), realBeforeCleanup);
        await writer.addScriptTag({ path: path.join(__dirname, '..', 'js/ai-log-preview.js') });
        assert.equal(await writer.evaluate(() => SigmaAiLogs.getDisplayRecords().length), 1);
        await reader.evaluate(() => { window.insightRefreshes = 0; addEventListener('sigma:refresh-analytics-cards', () => window.insightRefreshes++); });
        const provenance = await writer.evaluate(() => {
            const card = { id: 'source-test', title: 'Insight', area: 'submissions', evidenceIds: ['used'], analyses: [] };
            const snapshot = { studentId: 's1', areas: [{ id: 'submissions', records: [
                { id: 'used', title: 'Quiz 1', subjectId: 'Programming', sectionId: 'Rizal', sources: [
                    { id: 'submission-records', label: 'Submission Records' },
                    { id: 'assessment-results', label: 'Assessment Results' },
                    { id: 'submission-records', label: 'Submission Records' }] },
                { id: 'unused', sources: [{ id: 'attendance', label: 'Attendance Records' }] }
            ] }] };
            const logId = SigmaAiLogs.recordInsight({ userId: 's1', kind: 'student', card, snapshot, timestamp: new Date().toISOString() });
            snapshot.areas[0].records[0].title = 'Changed later';
            const sources = SigmaAiLogs.getRecords().find(log => log.id === logId).evidenceSources;
            const wrongId = SigmaAiLogs.recordInsight({ userId: 's2', kind: 'student', card, snapshot, timestamp: new Date().toISOString() });
            return { sources, wrong: SigmaAiLogs.getRecords().find(log => log.id === wrongId).evidenceSources };
        });
        assert.deepEqual(provenance.sources.map(source => source.label), ['Submission Records', 'Assessment Results']);
        assert.equal(provenance.sources[0].records.length, 1);
        assert.equal(provenance.sources[0].records[0].title, 'Quiz 1', 'Audit preserves generation-time evidence');
        assert.deepEqual(provenance.wrong, [], 'Another user snapshot cannot provide source references');
        await writer.evaluate(() => {
            const card = { id: 'insight-s1', title: 'Assessment Summary', analyses: [{ actionLabel: 'Try', context: 'Recorded context', text: 'Review your feedback.' }] };
            localStorage.setItem('sigma-student-analytics-v1:s1', JSON.stringify({ cards: [card], generatedCount: 1 }));
            localStorage.setItem('sigma-student-analytics-v1:s2', JSON.stringify({ cards: [{ ...card, id: 'insight-s2' }] }));
            window.insightLog = SigmaAiLogs.recordInsight({ userId: 's1', kind: 'student', card, timestamp: new Date().toISOString(), model: 'Test model' });
        });
        await writer.evaluate(() => SigmaAiLogs.deleteInsight(window.insightLog));
        await reader.waitForFunction(() => window.insightRefreshes > 0 && JSON.parse(localStorage.getItem('sigma-student-analytics-v1:s1')).cards.length === 0);
        assert.equal(await writer.evaluate(() => JSON.parse(localStorage.getItem('sigma-student-analytics-v1:s1')).generatedCount), 1);
        assert.equal(await writer.evaluate(() => JSON.parse(localStorage.getItem('sigma-student-analytics-v1:s2')).cards.length), 1);
        assert.equal(await writer.evaluate(() => SigmaAiLogs.getRecords().some(log => log.id === window.insightLog)), true);
        await writer.evaluate(() => {
            const oldCard = { id: 'teacher-card', title: 'Old insight', analyses: [{ actionLabel: 'Try', text: 'Old reply' }] };
            window.teacherLog = SigmaAiLogs.recordInsight({ userId: 't1', kind: 'teacher', card: oldCard, timestamp: new Date().toISOString() });
            localStorage.setItem('sigma-teacher-analytics-v1:t1', JSON.stringify({ cards: [{ ...oldCard, title: 'New insight' }] }));
        });
        assert.equal(await writer.evaluate(() => { try { SigmaAiLogs.deleteInsight(window.teacherLog); return false; } catch { return true; } }), true);
        assert.equal(await writer.evaluate(() => JSON.parse(localStorage.getItem('sigma-teacher-analytics-v1:t1')).cards[0].title), 'New insight');
        console.log('Recorded AI logs persist, synchronize across tabs, deduplicate request IDs and reject invalid records.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
