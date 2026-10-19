const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    const screenshots = fs.mkdtempSync(path.join(os.tmpdir(), 'sigma-record-lifecycle-'));
    let state = null, revision = 0, removed = false, logRemoved = false, savedLog = null, calls = [];
    try {
        const page = await browser.newPage({ viewport: { width: 1200, height: 850 } });
        await page.route('http://sigma.test/**', async route => {
            const url = new URL(route.request().url());
            if (!url.pathname.includes('/php/api/')) return route.fulfill({ body: '<html></html>', contentType: 'text/html' });
            const input = route.request().method() === 'POST' ? route.request().postDataJSON() : Object.fromEntries(url.searchParams);
            calls.push(input.action);
            let result = { success: true };
            if (url.pathname.endsWith('ai_records.php')) {
                if (input.action === 'state') result = { ...result, state: { ...(state || {}), cards: removed ? [] : state?.cards || [] }, revision, exists: !!state };
                if (input.action === 'save_state') { state = input.state; revision++; result = { ...result, state, revision, exists: true }; }
                if (input.action === 'save_log') savedLog ||= input.log;
                if (input.action === 'logs') result.logs = savedLog ? [{ ...savedLog, isDeleted: logRemoved, cardRecordId: 'card-db-id', cardRemoved: removed, cardRemovedBy: removed ? '0000000' : null }] : [];
            } else if (input.action) {
                if (input.table === 'ai_insight_cards') removed = input.action === 'remove';
                if (input.table === 'ai_logs') logRemoved = input.action === 'remove';
            } else result = { ...result, tables: ['users', 'ai_logs', 'ai_insight_cards'], records: ['all', 'ai_logs'].includes(input.table) && logRemoved ? [{ id: 'log-1', recordType: 'ai_logs', label: 'Recorded insight', deletedBy: '0000000', deletedAt: '2026-10-11 01:00:00' }] : [] };
            await route.fulfill({ json: result });
        });
        await page.goto('http://sigma.test/admin.html');
        await page.setContent('<div id="settings-submenu"><button id="nav-settings-recovery">Record Recovery</button></div><section id="audit-ai-view"><aside class="audit-log-sidebar"><nav><button>AI Logs</button><button>Activity Logs</button><button>Authentication Logs</button><button>Notification Logs</button></nav></aside></section>');
        for (const css of ['forms.css', 'shared-components.css', 'admin.css', 'record-lifecycle.css', 'log-pagination.css']) await page.addStyleTag({ path: path.join(root, 'css', css) });
        await page.addStyleTag({ content: '.hidden{display:none!important}body{margin:0}' });
        await page.evaluate(() => {
            sessionStorage.setItem('sigma-authenticated-user', JSON.stringify({ id: '0000000', role: 'Master Admin' }));
            const card = { id: 'test-card', title: 'Recorded insight', analyses: [{ text: 'Existing saved text', actionLabel: 'Try' }] };
            localStorage.setItem('sigma-student-analytics-v1:student-1', JSON.stringify({ cards: [card], fingerprint: 'already-processed', usedProvider: true }));
            localStorage.setItem('sigma-ai-recorded-logs', JSON.stringify([{ id: 'log-1', userId: 'student-1', feature: 'analytics', timestamp: '2026-10-11T00:00:00Z', status: 'Success', response: 'Existing saved text', source: { kind: 'student', cardId: card.id, signature: JSON.stringify(card) } }]));
        });
        await page.addScriptTag({ path: path.join(root, 'js/ai-database-store.js') });
        await page.addScriptTag({ path: path.join(root, 'js/ai-log-store.js') });
        await page.addScriptTag({ path: path.join(root, 'js/log-pagination.js') });
        await page.addScriptTag({ path: path.join(root, 'js/record-lifecycle.js') });
        assert.equal(await page.locator('#audit-ai-view .audit-log-sidebar nav > :last-child').textContent(), 'Notification Logs');
        assert.equal(await page.locator('#audit-ai-view > [data-removed-records]').count(), 0);
        await page.waitForFunction(() => SigmaAiLogs.getRecords().length === 1);
        assert.equal(state.cards[0].analyses[0].text, 'Existing saved text');
        await page.evaluate(() => SigmaAiLogs.deleteInsight('log-1'));
        assert.equal(await page.evaluate(() => SigmaAiDatabase.getState('student', 'student-1').cards.length), 0);
        assert.equal(await page.evaluate(() => SigmaAiLogs.getRecords().length), 1, 'Card removal retains its log');
        assert.equal(await page.evaluate(() => SigmaAiDatabase.getState('student', 'student-1').fingerprint), 'already-processed');
        await page.evaluate(() => SigmaAiDatabase.change('ai_insight_cards', 'card-db-id', 'restore'));
        assert.equal(await page.evaluate(() => SigmaAiDatabase.getState('student', 'student-1').cards.length), 1);
        await page.evaluate(() => SigmaAiLogs.deleteLog('log-1'));
        assert.equal(await page.evaluate(() => SigmaAiLogs.getRecords().length), 0);
        assert.equal(await page.evaluate(() => SigmaAiDatabase.getState('student', 'student-1').cards.length), 1, 'Log deletion retains its card');
        await page.getByRole('button', { name: 'Record Recovery' }).click();
        await page.waitForFunction(() => document.querySelectorAll('#settings-recovery-view tbody tr').length === 1);
        assert.equal(await page.locator('#settings-recovery-view tbody tr').count(), 1);
        for (const width of [1200, 390]) {
            await page.setViewportSize({ width, height: 850 });
            await page.getByRole('button', { name: 'Record Recovery' }).click();
            await page.waitForFunction(() => document.querySelector('#settings-recovery-view tbody tr'));
            assert.equal(await page.locator('dialog').count(), 0, 'Record Recovery is a page, not a modal');
            assert.equal(await page.locator('#settings-recovery-view select').inputValue(), 'all');
            assert.equal(await page.locator('#settings-recovery-view .removed-records-type').textContent(), 'AI Logs');
            const box = await page.locator('#settings-recovery-view').boundingBox();
            assert(box.x >= 0 && box.x + box.width <= width, 'Page fits viewport');
            await page.locator('#settings-recovery-view .removed-records-more').first().click();
            await page.waitForFunction(() => document.querySelector('.removed-records-menu:popover-open'));
            assert.equal(await page.getByRole('button', { name: 'Restore Recorded insight' }).count(), 1);
            assert.equal(await page.getByRole('button', { name: 'Permanently Delete Recorded insight' }).count(), 1);
            const actionBox = await page.getByRole('button', { name: 'Restore Recorded insight' }).boundingBox();
            assert(actionBox.x >= box.x && actionBox.x + actionBox.width <= box.x + box.width, 'Recovery actions stay visible');
            await page.screenshot({ path: path.join(screenshots, `removed-records-${width}.png`) });
            await page.keyboard.press('Escape');
            await page.waitForFunction(() => !document.querySelector('.removed-records-menu:popover-open'));
            await page.evaluate(() => { document.getElementById('settings-recovery-view').classList.add('hidden'); document.getElementById('audit-ai-view').classList.remove('hidden'); });
        }
        await page.evaluate(() => { localStorage.clear(); });
        await page.evaluate(() => SigmaAiDatabase.ensureState('student', 'student-1', true));
        assert.equal(await page.evaluate(() => SigmaAiDatabase.getState('student', 'student-1').cards[0].analyses[0].text), 'Existing saved text');
        assert(!calls.some(action => /generate|analyze/.test(action)), 'Read/remove/restore never calls AI');
        await page.getByRole('button', { name: 'Record Recovery' }).click();
        await page.locator('#settings-recovery-view .removed-records-more').click();
        page.once('dialog', dialog => dialog.accept());
        await page.getByRole('button', { name: 'Restore Recorded insight' }).click();
        await page.waitForFunction(() => SigmaAiLogs.getRecords().length === 1);
        assert.equal(logRemoved, false, 'All view restores the actual record table, not all');
        await page.locator('#settings-recovery-view select').selectOption('users');
        await page.waitForFunction(() => document.querySelector('[data-removed-empty]'));
        assert.equal(await page.locator('#settings-recovery-view tbody td').getAttribute('colspan'), '4');
        assert.equal(await page.locator('#settings-recovery-view .removed-records-content > [role=status]').isHidden(), true);
        assert.equal(await page.locator('#settings-recovery-view .sigma-empty-icon').evaluate(node => getComputedStyle(node).color), 'rgba(0, 0, 0, 0.45)');
        assert.equal(await page.locator('#settings-recovery-view .sigma-empty-subtitle').evaluate(node => getComputedStyle(node).color), 'rgba(0, 0, 0, 0.45)');
        assert.equal(await page.locator('#settings-recovery-view .record-recovery-layout').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(255, 255, 255)');
        for (const width of [1200, 390]) {
            await page.setViewportSize({ width, height: 850 });
            await page.screenshot({ path: path.join(screenshots, `removed-empty-${width}.png`) });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        }
        console.log('PASS: legacy import, database-backed reads after cache clearing, independent card/log actions, removal tracking, no generation calls, desktop/mobile recovery page. Screenshots: ' + screenshots);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
