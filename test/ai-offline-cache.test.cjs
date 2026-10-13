const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    let mode = 'offline', revision = 3, saved = 0;
    try {
        const page = await browser.newPage();
        await page.route('http://fixture.test/**', async route => {
            if (!route.request().url().includes('/php/api/')) return route.fulfill({ body: '<div id="ai-routing-feedback"></div>', contentType: 'text/html' });
            if (mode === 'offline') return route.abort();
            if (mode === 'denied') return route.fulfill({ status: 403, json: { success: false, error: 'Access denied' } });
            const input = route.request().method() === 'POST' ? route.request().postDataJSON() : Object.fromEntries(new URL(route.request().url()).searchParams);
            if (input.action === 'save_state') { saved++; revision++; }
            return route.fulfill({ json: { success: true, state: input.state || { cards: [{ id: 'server' }] }, revision, exists: true } });
        });
        await page.goto('http://fixture.test/student.html');
        await page.evaluate(() => {
            sessionStorage.setItem('sigma-authenticated-user', JSON.stringify({ id: 's1', role: 'Student' }));
            localStorage.setItem('sigma-student-analytics-v1:s1', JSON.stringify({ cards: [{ id: 'mine' }] }));
            localStorage.setItem('sigma-student-analytics-v1:s2', JSON.stringify({ cards: [{ id: 'other' }] }));
        });
        await page.addScriptTag({ path: 'js/ai-database-store.js' });
        assert.equal(await page.evaluate(async () => (await SigmaAiDatabase.ensureState('student', 's1')).cards[0].id), 'mine');
        assert.equal(await page.evaluate(() => SigmaAiDatabase.isOffline('student', 's1')), true);
        assert.equal(await page.evaluate(async () => { try { await SigmaAiDatabase.ensureState('student', 's2'); return false; } catch { return true; } }), true);
        mode = 'online';
        await page.evaluate(() => SigmaAiDatabase.ensureState('student', 's1', true));
        mode = 'offline';
        await page.evaluate(() => SigmaAiDatabase.saveState('student', 's1', { cards: [{ id: 'pending' }] }));
        mode = 'online';
        await page.evaluate(() => SigmaAiDatabase.ensureState('student', 's1', true));
        assert.equal(saved, 1);
        mode = 'offline';
        await page.evaluate(() => SigmaAiDatabase.saveState('student', 's1', { cards: [{ id: 'stale' }] }));
        revision++;
        mode = 'online';
        await page.evaluate(() => SigmaAiDatabase.ensureState('student', 's1', true));
        assert.equal(saved, 1, 'Conflict does not overwrite newer database state');
        mode = 'denied';
        assert.equal(await page.evaluate(async () => { try { await SigmaAiDatabase.ensureState('student', 's1', true); return false; } catch { return true; } }), true);
        console.log('PASS: owner-only offline cache, pending sync, revision conflict protection, and no authorization fallback.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
