const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
        await page.goto('http://127.0.0.1:5519/admin.html#nav-settings-recovery');
        const table = page.locator('#settings-recovery-view table');
        const footer = page.locator('#settings-recovery-view .sigma-log-pagination');
        await footer.waitFor({ state: 'visible' });
        let navigations = 0;
        page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
        for (const label of ['Next page', 'Previous page', 'Page 2', 'Page 1']) {
            await footer.scrollIntoViewIfNeeded();
            await footer.getByRole('button', { name: label, exact: true }).click();
            await page.waitForTimeout(100);
            assert.equal(await page.evaluate(() => window.scrollY), 0, label + ': return to the page top, not just the table');
            const filter = await page.locator('#settings-recovery-view select').boundingBox();
            assert.ok(filter.y >= 82 && filter.y < 250, label + ': record type filter is visible at the page top');
            const bounds = await table.evaluate(table => {
                const row = table.tBodies[0].rows[0].getBoundingClientRect();
                return { rowTop: row.top, rowBottom: row.bottom, headerBottom: document.getElementById('admin-header').getBoundingClientRect().bottom, height: innerHeight };
            });
            assert.ok(bounds.rowTop >= bounds.headerBottom, label + ': first row is not hidden under the header');
            assert.ok(bounds.rowBottom <= bounds.height, label + ': first row is visible after changing pages');
        }
        assert.equal(navigations, 0, 'Changing pages must not reload or navigate the website');
        console.log('PASS: next, previous, and page numbers return to page scroll position zero with filters visible and no website reload.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
