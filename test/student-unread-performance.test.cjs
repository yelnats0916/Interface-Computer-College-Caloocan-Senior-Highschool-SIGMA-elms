const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.route('http://sigma.test/**', route => route.fulfill({ contentType: 'text/html', body: '<button id="mobile-subbar-analytics"></button><div id="cards"></div><div id="unrelated"></div><div><button class="sigma-insight-search-toggle"></button></div>' }));
        await page.goto('http://sigma.test/student.html');
        await page.evaluate(() => {
            sessionStorage.setItem('sigma-authenticated-user', JSON.stringify({ id: 'performance-test' }));
            window.storageWrites = 0;
            const original = Storage.prototype.setItem;
            Storage.prototype.setItem = function (...args) { window.storageWrites++; return original.apply(this, args); };
        });
        await page.addScriptTag({ path: path.join(__dirname, '../js/analytics-unread.js') });
        await page.waitForTimeout(100);
        const initialWrites = await page.evaluate(() => storageWrites);
        await page.evaluate(() => {
            for (let i = 0; i < 100; i++) document.getElementById('unrelated').append(document.createElement('span'));
        });
        await page.waitForTimeout(100);
        assert.equal(await page.evaluate(() => storageWrites), initialWrites);
        await page.evaluate(() => {
            document.getElementById('cards').innerHTML = '<article class="sigma-card--insight" data-id="new"><div class="sigma-insight-actions"></div></article>';
        });
        await page.waitForTimeout(100);
        assert.equal(await page.locator('.sigma-insight-new-badge').count(), 1);
        await page.getByRole('button', { name: 'Mark all insights as read' }).click();
        assert.equal(await page.locator('.sigma-insight-new-badge').count(), 0);
        const savedWrites = await page.evaluate(() => storageWrites);
        await page.evaluate(() => {
            window.dispatchEvent(new StorageEvent('storage', { key: 'sigma-insight-read-v1:performance-test', newValue: localStorage.getItem('sigma-insight-read-v1:performance-test') }));
        });
        await page.waitForTimeout(100);
        assert.equal(await page.evaluate(() => storageWrites), savedWrites);
        console.log('PASS: unrelated mutations do not write; new insights and mark-read work; cross-tab replay does not rewrite storage.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
