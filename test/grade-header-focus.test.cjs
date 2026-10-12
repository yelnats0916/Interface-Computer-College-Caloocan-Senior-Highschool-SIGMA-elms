const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        for (const role of ['teacher', 'admin']) {
            const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
            await page.setContent('<div id="section-topic-content"><div class="topic-score-sticky is-expanded"><div class="desktop-grading-header border-b" tabindex="0" style="border-bottom-style:solid;border-bottom-width:1px">Grade<button>Expand</button></div></div></div>');
            const root = path.join(__dirname, '..');
            for (const match of fs.readFileSync(path.join(root, `${role}.html`), 'utf8').matchAll(/href="(css\/[^"?]+\.css)/g)) await page.addStyleTag({ path: path.join(root, match[1]) });
            for (const selector of ['.desktop-grading-header', '.desktop-grading-header button']) {
                await page.locator(selector).click();
                const color = await page.locator('.desktop-grading-header').evaluate(node => getComputedStyle(node).borderBottomColor);
                assert.equal(color, 'rgba(0, 0, 0, 0.1)', `${role}: ${selector}`);
            }
            await page.close();
        }
        console.log('PASS: Grade divider stays neutral after header and chevron-button focus');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
