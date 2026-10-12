const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
        await page.route('**/record_lifecycle.php?**', route => {
            const url = new URL(route.request().url());
            if (url.searchParams.get('view') !== 'events') return route.continue();
            return route.fulfill({ json: { success: true, events: Array.from({ length: 26 }, (_, id) => ({
                id: String(id), recordType: 'quizzes', recordId: 'audit-fixture-' + id,
                action: ['remove', 'restore', 'purge'][id % 3], timestamp: '2026-10-11 03:00:00',
                actor: { id: 'sample-admin', name: 'Sample Administrator', role: 'Admin' }
            })) } });
        });
        await page.goto('http://127.0.0.1:5519/admin.html#nav-settings-recovery');
        await page.waitForSelector('#settings-recovery-view:not(.hidden) tbody tr');
        assert.equal(await page.locator('#settings-submenu #nav-settings-recovery').textContent().then(text => text.trim()), 'Record Recovery');
        assert.equal(await page.locator('.audit-log-sidebar [data-removed-records]').count(), 0);
        assert.equal(await page.locator('#settings-recovery-view .audit-log-sidebar').count(), 0);
        assert.match(await page.locator('#admin-header').textContent(), /System Settings[\s\S]*Record Recovery/);
        const recovery = page.locator('#settings-recovery-view');
        const search = recovery.getByRole('searchbox');
        assert.equal(await search.getAttribute('maxlength'), '100');
        assert.equal(await recovery.locator('.record-recovery-search > button').textContent(), 'Search');
        assert.equal(await recovery.locator('.record-recovery-search > button i').count(), 0);
        const layout = await recovery.evaluate(section => {
            const dropdown = section.querySelector('select').getBoundingClientRect();
            const form = section.querySelector('form').getBoundingClientRect();
            const input = section.querySelector('input[type=search]');
            const logInput = document.querySelector('.audit-log-search input');
            const style = el => ['height', 'borderRadius', 'backgroundColor', 'borderColor'].map(key => getComputedStyle(el)[key]);
            return { aligned: Math.abs(dropdown.bottom - form.bottom) < 2, right: form.left > dropdown.right, recoveryStyle: style(input), logStyle: style(logInput) };
        });
        assert.ok(layout.aligned && layout.right, 'Dropdown and right-aligned search share one row');
        assert.deepEqual(layout.recoveryStyle, layout.logStyle, 'Recovery search matches log styling');
        const dropdown = recovery.locator('select');
        const selectStyle = el => ['height', 'borderRadius', 'backgroundColor', 'borderColor', 'padding', 'appearance'].map(key => getComputedStyle(el)[key]);
        const accountStyle = await page.locator('#user-search-role').evaluate(selectStyle);
        assert.deepEqual(await dropdown.evaluate(selectStyle), accountStyle, 'Recovery dropdown matches the account filter');
        assert.equal(await recovery.locator('.sigma-select-wrapper .sigma-select-icon').count(), 1);
        await dropdown.hover();
        await page.waitForTimeout(180);
        assert.equal(await dropdown.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(241, 245, 249)');
        assert.equal(await dropdown.evaluate(el => getComputedStyle(el).borderTopColor), 'rgb(148, 163, 184)');
        await dropdown.focus();
        await page.waitForTimeout(180);
        assert.equal(await dropdown.evaluate(el => getComputedStyle(el).borderTopColor), 'rgb(255, 208, 0)');
        await search.fill('A'.repeat(110) + '\u007f');
        assert.equal((await search.inputValue()).length, 100);
        await search.fill('Alex\u007f');
        assert.equal(await search.inputValue(), 'Alex');
        await recovery.getByRole('button', { name: 'Search records', exact: true }).click();
        assert.match(await recovery.locator('tbody').textContent(), /Alex/);
        await recovery.getByRole('button', { name: 'Clear search', exact: true }).click();
        await recovery.getByRole('button', { name: 'Search records', exact: true }).click();
        await page.screenshot({ path: 'C:/Users/stanl/AppData/Local/Temp/sigma-recovery-search.png' });
        await page.reload();
        await page.waitForSelector('#settings-recovery-view:not(.hidden) tbody tr');
        await page.goto('http://127.0.0.1:5519/admin.html#nav-audit-removed');
        await page.waitForSelector('#settings-recovery-view:not(.hidden) tbody tr');
        assert.equal(await page.evaluate(() => location.hash), '#nav-settings-recovery', 'Legacy recovery links redirect into settings');
        await page.evaluate(() => window.switchTab('nav-audit-activity'));
        await page.waitForFunction(() => document.querySelector('#audit-activity-view tbody')?.textContent.includes('audit-fixture-0'));
        assert.equal(await page.locator('#audit-activity-view tbody tr').count(), 20);
        const text = await page.locator('#audit-activity-view tbody').textContent();
        assert.match(text, /Record Deleted/);
        assert.match(text, /Record Restored/);
        assert.match(text, /Record Permanently Deleted/);
        await page.locator('#audit-activity-view .sigma-log-pagination').getByRole('button', { name: 'Next page', exact: true }).click();
        assert.equal(await page.locator('#audit-activity-view tbody tr').count(), 6);
        assert.match(await page.locator('#admin-header').textContent(), /Audit Logs[\s\S]*Activity Logs/);
        console.log('PASS: recovery under System Settings, formal title, direct links, refresh, legacy redirect, and deletion/restoration history in paginated Activity Logs.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
