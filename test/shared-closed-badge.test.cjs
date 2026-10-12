const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const root = path.join(__dirname, '..');
        const page = await browser.newPage();
        await page.setContent('<html><body></body></html>');
        for (const match of fs.readFileSync(path.join(root, 'student.html'), 'utf8').matchAll(/href="(css\/[^"?]+\.css)/g)) await page.addStyleTag({ path: path.join(root, match[1]) });
        await page.addScriptTag({ path: path.join(root, 'js/shared-components.js') });
        await page.evaluate(() => {
            const badge = window.renderAssessmentClosedBadgeHtml();
            document.body.innerHTML = `<div class="assessment-closed-badge-row">${badge}</div><div id="student-submission-action-area"><div>${badge}</div></div>`;
        });
        for (const width of [375, 1200]) {
            await page.setViewportSize({ width, height: 667 });
            await page.waitForTimeout(100);
            const badges = await page.locator('.assessment-closed-badge').evaluateAll(nodes => nodes.map(node => ({
                font: getComputedStyle(node).fontSize, height: node.getBoundingClientRect().height,
                overflow: node.scrollWidth > node.clientWidth, icon: Boolean(node.querySelector('.fa-lock'))
            })));
            assert.deepEqual(badges[0], badges[1]);
            assert.equal(badges[0].font, width < 768 ? '11px' : '12px');
            assert.equal(badges[0].overflow, false);
            assert.equal(badges[0].icon, true);
        }
        console.log('PASS: shared closed badge matches across both states, with icon and readable mobile sizing');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
