const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
        await page.setContent('<div id="student-submission-action-area"><div><div><span class="select-none">Submissions Closed</span></div><div><span class="select-none"><i class="fa-clock-rotate-left"></i><span>Submitted - Awaiting Review</span></span></div></div></div>');
        const root = path.join(__dirname, '..');
        for (const match of fs.readFileSync(path.join(root, 'student.html'), 'utf8').matchAll(/href="(css\/[^"?]+\.css)/g)) {
            await page.addStyleTag({ path: path.join(root, match[1]) });
        }
        const sizes = await page.locator('span.select-none').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
        assert.deepEqual(sizes, [30, 30]);
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(100);
        const mobileSizes = await page.locator('span.select-none').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
        assert.deepEqual(mobileSizes, [26, 26]);
        console.log('PASS: desktop badges retain 30px height and mobile badges retain 26px height');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
