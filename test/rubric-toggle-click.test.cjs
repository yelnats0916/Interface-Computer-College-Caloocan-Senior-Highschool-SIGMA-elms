const { chromium } = require('playwright');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.setContent('<label class="sigma-toggle-switch material-rubric-toggle"><input type="checkbox" onchange="window.changed=this.checked"><span class="sigma-toggle-slider"></span></label>');
        for (const file of ['classroom-room.css', 'shared-components.css']) await page.addStyleTag({ path: path.join(__dirname, '../css', file) });
        await page.locator('.sigma-toggle-slider').click();
        assert.equal(await page.evaluate(() => window.changed), true);
        await page.locator('.sigma-toggle-slider').click();
        assert.equal(await page.evaluate(() => window.changed), false);
        console.log('PASS: rubric toggle receives clicks and triggers changes on/off.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
