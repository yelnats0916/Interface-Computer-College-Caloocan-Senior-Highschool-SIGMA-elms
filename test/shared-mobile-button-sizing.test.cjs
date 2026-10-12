const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        for (const portal of ['admin', 'teacher', 'student']) {
            const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
            await page.setContent('<div id="student-classroom-grades-modal-overlay"><div class="sigma-modal-footer"><button class="sigma-btn sigma-btn-white sigma-modal-btn">Close</button><button class="sigma-btn sigma-btn-primary sigma-modal-btn"><span>View Analytics</span></button></div></div><button class="sigma-btn sigma-btn-md sigma-btn-primary"><span>Save</span></button><button class="sigma-btn sigma-btn-sm sigma-btn-white">Cancel</button>');
            for (const file of ['forms.css', 'shared-components.css', portal + '.css', 'mobile.css']) await page.addStyleTag({ path: path.join(__dirname, '../css', file) });
            for (const width of [320, 390, 768]) {
                await page.setViewportSize({ width, height: 800 });
                await page.waitForTimeout(250);
                for (const button of await page.locator('button').all()) {
                    const styles = await button.evaluate(el => ({ height: getComputedStyle(el).height, font: getComputedStyle(el).fontSize, radius: getComputedStyle(el).borderRadius }));
                    assert.deepEqual(styles, { height: '36px', font: '12px', radius: '8px' }, portal + ' shared actions');
                }
            }
            await page.setViewportSize({ width: 1200, height: 800 });
            await page.waitForTimeout(250);
            assert.equal(await page.locator('.sigma-btn-md').evaluate(el => getComputedStyle(el).height), '46px');
            await page.close();
        }
        console.log('PASS: Admin, Teacher, Student shared mobile actions use 36px height and 12px text; desktop sizing unchanged.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
