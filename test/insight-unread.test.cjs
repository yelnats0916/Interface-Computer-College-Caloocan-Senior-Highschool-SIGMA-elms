const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.route('http://fixture.test/**', route => route.fulfill({ contentType: 'text/html', body: '<button id="mobile-subbar-analytics"></button><div><button class="sigma-insight-search-toggle"></button></div><div id="analytics-dropdown"><div class="sigma-card--insight" data-id="one"><div class="sigma-insight-actions"></div></div></div>' }));
        await page.goto('http://fixture.test/student.html');
        await page.evaluate(() => sessionStorage.setItem('sigma-authenticated-user', JSON.stringify({ id: 'student1' })));
        await page.addScriptTag({ path: 'js/analytics-unread.js' });
        assert.equal(await page.locator('.sigma-insight-unread-dot').count(), 0);
        assert.equal(await page.locator('.sigma-insight-new-badge').textContent(), 'New');
        assert.equal(await page.locator('.mobile-subbar-badge').textContent(), '1');
        await page.evaluate(() => document.getElementById('analytics-dropdown').classList.add('open'));
        assert.equal(await page.locator('.mobile-subbar-badge').textContent(), '1');
        await page.evaluate(() => window.markInsightRead('one'));
        assert.equal(await page.locator('.sigma-insight-unread-dot').count(), 0);
        assert.equal(await page.locator('.sigma-insight-new-badge').count(), 0);
        await page.reload();
        await page.addScriptTag({ path: 'js/analytics-unread.js' });
        assert.equal(await page.locator('.sigma-insight-unread-dot').count(), 0);
        await page.reload();
        await page.evaluate(() => sessionStorage.setItem('sigma-authenticated-user', JSON.stringify({ id: 'student2' })));
        await page.addScriptTag({ path: 'js/analytics-unread.js' });
        assert.equal(await page.locator('.sigma-insight-unread-dot').count(), 0);
        assert.equal(await page.locator('.sigma-insight-new-badge').count(), 1);
        await page.getByRole('button', { name: 'Mark all insights as read', exact: true }).click();
        assert.equal(await page.locator('.sigma-insight-unread-dot').count(), 0);
        assert.equal(await page.getByRole('button', { name: 'Mark all insights as read', exact: true }).isDisabled(), true);
        console.log('PASS: per-card read state persists, panel opening does not clear it, accounts remain separate.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
