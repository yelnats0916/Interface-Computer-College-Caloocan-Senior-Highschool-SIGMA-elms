const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.route('**/php/api/**', route => route.abort());
        await page.goto('http://127.0.0.1:5519/test/release-workspace.html');
        for (const role of ['student', 'teacher', 'admin']) {
            for (const width of [1200, 390]) {
                await page.setViewportSize({ width, height: 800 });
                await page.evaluate(role => {
                    window.currentUser = { role };
                    window.openQuizPreviewModal({ title: 'Role layout', questions: [{
                        type: 'Multiple Choice', question: 'Choose one.', choices: ['One', 'Two'], answer: 'One', points: 5
                    }] });
                }, role);
                const metrics = await page.evaluate(() => {
                    const modal = document.querySelector('#universal-quiz-preview-modal');
                    const content = document.querySelector('#uqp-body');
                    const header = modal.querySelector('.sigma-quiz-sticky-header').getBoundingClientRect();
                    const footer = modal.querySelector('.sigma-modal-footer').getBoundingClientRect();
                    const box = content.getBoundingClientRect();
                    return { midpoint: (box.top + box.bottom) / 2, available: (header.bottom + footer.top) / 2,
                        selection: getComputedStyle(content).userSelect, full: modal.scrollHeight, height: modal.clientHeight };
                });
                assert.ok(Math.abs(metrics.midpoint - metrics.available) < 5, `${role}/${width}: ${JSON.stringify(metrics)}`);
                assert.equal(metrics.selection, 'none');
                assert.ok(metrics.full <= metrics.height + 2, `${role}/${width}: short question overflow`);
                assert.equal(await page.locator('#uqp-footer-counter').textContent(), 'Question 1 of 1');
                const counterBox = await page.locator('#uqp-footer-counter').boundingBox();
                assert.ok(Math.abs(counterBox.x + counterBox.width / 2 - width / 2) < 3, 'Footer counter stays centered');
                await page.evaluate(() => window.closeQuizPreviewModal(true));
            }
        }
        console.log('PASS: shared student, teacher and admin quiz layout centered on desktop and mobile');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
