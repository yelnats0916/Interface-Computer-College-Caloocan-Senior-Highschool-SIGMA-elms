const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        const page = await browser.newPage();
        await page.setContent('<dialog class="sigma-insight-dialog"><header class="sigma-insight-detail-header">Class Assessment Summary</header><div class="sigma-insight-detail-body"><div class="sigma-insight-detail-text">Two assessments have submitted work.</div></div><footer class="sigma-insight-detail-footer"></footer></dialog>');
        await page.addStyleTag({ path: path.join(__dirname, '../css/sigma-analytics.css') });
        await page.evaluate(() => document.querySelector('dialog').showModal());
        for (const size of [{ width: 1200, height: 900 }, { width: 390, height: 844 }, { width: 390, height: 600 }, { width: 320, height: 480 }]) {
            await page.setViewportSize(size);
            await page.locator('.sigma-insight-detail-text').evaluate(node => node.textContent = 'Two assessments have submitted work.');
            const short = await page.locator('dialog').boundingBox();
            const mobile = size.width <= 768;
            if (mobile) assert.equal(short.height, size.height, 'Mobile insight is full-screen');
            else assert.ok(short.height < 250, 'Desktop modal fits short content');
            const margin = mobile ? 0 : 12;
            assert.ok(short.y >= margin && short.y + short.height <= size.height - margin);
            await page.locator('.sigma-insight-detail-text').evaluate(node => node.textContent = 'Assessment summary and recommendations. '.repeat(500));
            const tall = await page.locator('dialog').boundingBox();
            assert.ok(tall.y >= margin && tall.y + tall.height <= size.height - margin);
            assert.ok(await page.locator('.sigma-insight-detail-body').evaluate(node => node.scrollHeight > node.clientHeight), 'Long body must scroll');
            const footer = await page.locator('footer').boundingBox();
            assert.ok(footer.y + footer.height <= size.height - margin, 'Green footer stays inside viewport');
        }
        console.log('Insight modal sizing passed: auto height, scrolling body, footer and mobile viewport clearance.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
