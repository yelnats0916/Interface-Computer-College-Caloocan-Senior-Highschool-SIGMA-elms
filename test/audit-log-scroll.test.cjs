const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1904, height: 910 } });
        await page.goto('http://127.0.0.1:5519/admin.html#nav-audit-ai');
        await page.waitForSelector('#audit-ai-view:not(.hidden) .audit-log-layout');
        await page.waitForTimeout(1000);
        for (const route of ['ai', 'activity', 'auth', 'notifications']) {
            await page.evaluate(route => { location.hash = 'nav-audit-' + route; }, route);
            await page.waitForSelector('#audit-' + route + '-view:not(.hidden)');
            const sizing = await page.evaluate(route => {
                const layout = document.querySelector('#audit-' + route + '-view .audit-log-layout');
                const bounds = layout.getBoundingClientRect();
                return { minimum: parseFloat(getComputedStyle(layout).minHeight), available: innerHeight - bounds.top };
            }, route);
            assert.ok(Math.abs(sizing.minimum - sizing.available) <= 1, route + ': minimum height must exclude the header');
        }
        await page.evaluate(() => { location.hash = 'nav-audit-ai'; });
        await page.waitForSelector('#audit-ai-view:not(.hidden)');
        await page.evaluate(() => {
            const body = document.querySelector('#audit-ai-view table tbody');
            body.innerHTML = '<tr><td colspan="5">No records</td></tr>';
        });
        await page.waitForTimeout(100);
        assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), 'Short content must not scroll');
        await page.evaluate(() => {
            const content = document.querySelector('#audit-ai-view .audit-log-sidebar + div');
            const tallContent = document.createElement('div');
            tallContent.style.height = '1500px';
            content.append(tallContent);
        });
        assert.ok(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight), 'Long content must remain scrollable');
        console.log('PASS: all audit layouts exclude header height; short pages do not scroll and long pages remain scrollable.');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
