const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        for (const role of ['teacher', 'admin']) {
            const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
            await page.setContent('<html><body></body></html>');
            const source = fs.readFileSync(path.join(root, `${role}.html`), 'utf8');
            for (const match of source.matchAll(/href="(css\/[^"?]+\.css)/g)) {
                await page.addStyleTag({ path: path.join(root, match[1]) });
            }
            await page.addScriptTag({ path: path.join(root, 'js/shared-components.js') });
            await page.evaluate(() => {
                window.hasCurrentAssessmentSubmission = student => student.id === 'photo';
                window.resolveUserAvatar = student => student.id === 'photo'
                    ? 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="green"/></svg>') : '';
                document.body.innerHTML = window.renderGradingStudentCoverHtml({
                    allStudents: [{ id: 'photo', name: 'Photo Student' }, { id: 'default', name: 'Default Student' }], isListOpen: true
                });
            });
            for (const width of [375, 1200]) {
                await page.setViewportSize({ width, height: 667 });
                await page.waitForTimeout(100);
                const sizes = await page.locator('.topic-student-cover__row > .sigma-user-avatar').evaluateAll(nodes => nodes.map(node => {
                    const rect = node.getBoundingClientRect();
                    return { width: rect.width, height: rect.height, radius: getComputedStyle(node).borderRadius };
                }));
                assert.equal(sizes.length, 2);
                for (const size of sizes) {
                    assert.equal(size.width, width <= 768 ? 34 : 38, `${role} ${width}: width`);
                    assert.equal(size.height, width <= 768 ? 34 : 38, `${role} ${width}: height`);
                    assert.equal(size.radius, '50%');
                }
            }
            await page.close();
        }
        console.log('PASS: picker avatars are 34px on mobile and retain 38px on desktop');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
