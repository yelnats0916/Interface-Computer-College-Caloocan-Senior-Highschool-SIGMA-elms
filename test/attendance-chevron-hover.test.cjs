const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        const page = await browser.newPage();
        await page.setContent('<table class="attendance-month-table"><thead><tr><th class="student-name-col" style="width:250px;background:#15803d"><span>Students</span><span class="attendance-students-expand-btn"><i>›</i></span></th></tr></thead></table>');
        for (const file of ['teacher.css', 'classroom-room.css', 'mobile.css']) {
            await page.addStyleTag({ path: path.join(__dirname, '..', 'css', file) });
        }
        await page.setContent('<section class="sigma-grades-page"><table id="admin-gradebook-spreadsheet"><thead><tr><th style="background:#15803d"><button class="gradebook-back-btn">Back</button><button class="gb-thin-nav-btn">Next</button><button class="gb-thin-nav-btn" disabled>Previous</button><button class="gb-mobile-summary-toggle"><span>Summary</span><i>›</i></button><button class="gb-mobile-totals-toggle"><span>Grades</span><i>›</i></button></th></tr></thead></table></section>');
        for (const file of ['shared-components.css', 'sigma-analytics.css', 'mobile.css']) {
            await page.addStyleTag({ path: path.join(__dirname, '..', 'css', file) });
        }
        for (const width of [1200, 390]) {
            await page.setViewportSize({ width, height: 800 });
            for (const selector of ['.gradebook-back-btn', '.gb-thin-nav-btn:not(:disabled)']) {
                const button = page.locator(selector);
                await page.mouse.move(width - 1, 700);
                await page.waitForTimeout(200);
                assert.equal(await button.evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
                await button.hover();
                await page.waitForTimeout(200);
                assert.notEqual(await button.evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
            }
            assert.equal(await page.locator('.gb-thin-nav-btn:disabled').evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
        }
        for (const selector of ['.gb-mobile-summary-toggle', '.gb-mobile-totals-toggle']) {
            const button = page.locator(selector);
            await page.mouse.move(389, 700);
            await page.waitForTimeout(200);
            assert.equal(await button.evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
            assert.equal(await button.locator('i').evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
            await button.hover();
            await page.waitForTimeout(200);
            assert.equal(await button.locator('i').evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(255, 255, 255, 0.38)');
        }
        await page.setContent('<table class="attendance-month-table"><thead><tr><th class="student-name-col" style="width:250px;background:#15803d"><span>Students</span><span class="attendance-students-expand-btn"><i>›</i></span></th></tr></thead></table>');
        for (const file of ['teacher.css', 'classroom-room.css', 'mobile.css']) {
            await page.addStyleTag({ path: path.join(__dirname, '..', 'css', file) });
        }
        const toggle = page.locator('.attendance-students-expand-btn');
        for (const width of [1200, 390]) {
            await page.setViewportSize({ width, height: 800 });
            await page.mouse.move(width - 1, 700);
            await page.waitForTimeout(200);
            assert.equal(await toggle.evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
            await toggle.hover();
            await page.waitForTimeout(200);
            assert.equal(await toggle.evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(255, 255, 255, 0.45)');
            assert.equal(await toggle.evaluate(el => getComputedStyle(el).borderRadius), '9999px');
        }
        console.log('Attendance chevron circle appears only on hover at desktop and mobile widths.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
