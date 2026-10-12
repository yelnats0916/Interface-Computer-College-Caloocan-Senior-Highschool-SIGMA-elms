const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
        const quiz = { id: 9301, title: 'Touch matching', questions: [{ type: 'Matching Type', question: 'Match each type.', points: 10, pairs: [{ premise: 'int', target: 'Whole numbers' }, { premise: 'float', target: 'Decimals' }] }] };
        await page.route('**/php/api/**', route => route.request().url().includes('quiz_library.php')
            ? route.fulfill({ json: { success: true, quizzes: [quiz] } }) : route.abort());
        await page.goto('http://127.0.0.1:5519/quiz-creator.html?mode=edit&id=9301');
        await page.waitForFunction(() => document.getElementById('sidebar-question-count-badge')?.textContent.includes('1 /'));
        await page.evaluate(() => window.openStudentQuizPreviewModal());
        await page.locator('.sigma-quiz-matching-bank').waitFor();
        await page.evaluate(() => {
            const source = [...document.querySelectorAll('.sigma-quiz-matching-bank [draggable="true"]')].find(el => el.textContent.includes('Whole numbers'));
            const rect = source.getBoundingClientRect();
            const touch = new Touch({ identifier: 1, target: source, clientX: rect.x + 20, clientY: rect.y + 20 });
            source.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [touch], changedTouches: [touch] }));
        });
        await page.waitForTimeout(220);
        assert.equal(await page.locator('.sigma-quiz-choice-drag-visual').count(), 1);
        await page.evaluate(() => {
            const slot = document.querySelector('.sigma-quiz-matching-rows [ondrop]');
            slot.scrollIntoView({ block: 'center' });
            const rect = slot.getBoundingClientRect();
            const touch = new Touch({ identifier: 1, target: slot, clientX: rect.x + 20, clientY: rect.y + 20 });
            slot.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [touch], changedTouches: [touch] }));
        });
        await page.waitForTimeout(200);
        assert.equal(await page.locator('.sigma-quiz-matching-rows [ondrop]').first().evaluate(el => getComputedStyle(el).borderTopColor), 'rgb(255, 208, 0)');
        await page.evaluate(() => {
            const slot = document.querySelector('.sigma-quiz-matching-rows [ondrop]');
            const rect = slot.getBoundingClientRect();
            const touch = new Touch({ identifier: 1, target: slot, clientX: rect.x + 20, clientY: rect.y + 20 });
            slot.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], changedTouches: [touch] }));
        });
        assert.equal(await page.evaluate(() => window.previewUserAnswers[0][0]), 'Whole numbers');
        assert.equal(await page.locator('.sigma-quiz-choice-drag-visual').count(), 0);
        console.log('PASS: mobile hold, drag, drop and visual cleanup');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
