const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true, ignoreDefaultArgs: ['--hide-scrollbars'], args: ['--disable-features=OverlayScrollbar'] });
    try {
        const page = await browser.newPage();
        await page.route('**/php/api/**', route => route.abort());
        await page.goto('http://127.0.0.1:5519/test/release-workspace.html');
        assert.equal(await page.evaluate(() => window.renderSharedMatchingEarnedHtml({ earned: 5, max: 5, visible: false })), '');
        assert.match(await page.evaluate(() => window.renderSharedMatchingEarnedHtml({ earned: 5, max: 5 })), /Earned: 5 points/);
        assert.match(await page.evaluate(() => window.renderSharedMatchingEarnedHtml({ earned: 0, max: 5 })), /Earned: 0 points/);
        await page.evaluate(() => {
            const background = document.createElement('main');
            background.id = 'main-content';
            background.style.cssText = 'height:100vh;overflow-y:scroll';
            const content = document.createElement('div');
            content.style.height = '3000px';
            background.append(content);
            document.body.append(background);
        });
        for (const role of (process.env.MATCHING_ONLY ? [] : ['student', 'teacher', 'admin'])) {
            await page.setViewportSize({ width: 1200, height: 700 });
            await page.evaluate(role => {
                window.currentUser = { role };
                window.openQuizPreviewModal({ title: 'Scroll fixture', questions: [
                    { type: 'Essay', question: 'Long response', points: 5 },
                    { type: 'Essay', question: 'Next response', points: 5 }
                ] });
                const content = document.createElement('div');
                content.style.height = '2400px';
                content.textContent = 'Long submitted response';
                document.getElementById('uqp-body').append(content);
            }, role);
            const modal = page.locator('#universal-quiz-preview-modal');
            assert.equal(await modal.evaluate(el => getComputedStyle(el).scrollbarColor), 'auto', 'Use the same native scrollbar colors as Creator Preview');
            assert.equal(await page.evaluate(() => document.documentElement.clientWidth), 1200, 'Background page must not reserve a second scrollbar');
            assert.equal(await page.locator('#main-content').evaluate(el => getComputedStyle(el).overflowY), 'hidden', 'Background portal scroll area is locked');
            assert.equal(await page.locator('#uqp-scroll').evaluate(el => getComputedStyle(el).overflowY), 'visible', 'No nested question scrollbar');
            const box = await modal.boundingBox();
            const metrics = await modal.evaluate(el => ({ height: el.clientHeight, full: el.scrollHeight, width: el.clientWidth, offset: el.offsetWidth, overflow: getComputedStyle(el).overflowY }));
            assert.ok(metrics.full > metrics.height);
            assert.ok(metrics.offset > metrics.width, 'Review scrollbar must have its own gutter');
            await page.mouse.move(box.x + box.width - 3, box.y + 20);
            await page.mouse.down();
            await page.mouse.move(box.x + box.width - 3, box.y + box.height - 20, { steps: 15 });
            await page.mouse.up();
            assert.ok(await modal.evaluate(el => el.scrollTop) > 100, 'Dragging the review scrollbar should scroll the review');
            assert.equal(await page.evaluate(() => window.scrollY), 0, 'The background page must not scroll');
            await modal.evaluate(el => { el.scrollTop = 0; });
            await page.evaluate(() => {
                const area = document.getElementById('universal-quiz-preview-modal').getBoundingClientRect();
                window.handleUniversalMatchingDragStart({ clientY: area.bottom - 5, dataTransfer: new DataTransfer() }, 'Answer');
            });
            await page.waitForTimeout(250);
            assert.ok(await modal.evaluate(el => el.scrollTop) > 50, 'Edge dragging automatically scrolls the question area');
            await page.evaluate(() => window.handleUniversalMatchingDragEnd());
            assert.equal(await page.evaluate(() => window.scrollY), 0);
            await page.mouse.move(600, 350);
            await page.mouse.wheel(0, -300);
            await page.waitForTimeout(200);
            const retained = await modal.evaluate(el => el.scrollTop);
            await page.waitForTimeout(250);
            assert.equal(await modal.evaluate(el => el.scrollTop), retained, 'Manual scrolling must not be reset');
            await page.evaluate(() => window.navQuizPreview(1));
            assert.equal(await modal.evaluate(el => el.scrollTop), 0, 'Next question starts at the top of the review, not the page');
            await page.setViewportSize({ width: 390, height: 700 });
            await page.evaluate(() => {
                const content = document.createElement('div');
                content.style.height = '2400px';
                document.getElementById('uqp-body').append(content);
            });
            await page.mouse.move(190, 350);
            await page.mouse.wheel(0, 500);
            await page.waitForTimeout(200);
            assert.ok(await modal.evaluate(el => el.scrollTop) > 100, 'Mobile review must remain scrollable');
            await page.evaluate(() => window.jumpToQuizPreviewQuestion(0));
            assert.equal(await modal.evaluate(el => el.scrollTop), 0, 'Question selector resets only review scroll');
            await page.evaluate(() => window.closeQuizPreviewModal(true));
            await page.setViewportSize({ width: 1200, height: 900 });
            await page.evaluate(() => window.openQuizPreviewModal({ title: 'Short question', questions: [{ type: 'Multiple Choice', question: 'Choose one.', choices: ['A', 'B'], answer: 'A', points: 5 }] }));
            assert.equal(await modal.evaluate(el => el.scrollHeight <= el.clientHeight + 1), true, 'Short questions have no scrollable empty space');
            await page.evaluate(() => window.handleUniversalMatchingDragStart({ clientY: innerHeight - 5, dataTransfer: new DataTransfer() }, 'Answer'));
            await page.waitForTimeout(200);
            assert.equal(await modal.evaluate(el => el.scrollTop), 0, 'Auto-scroll stays still when no content is below');
            await page.evaluate(() => { window.handleUniversalMatchingDragEnd(); window.closeQuizPreviewModal(true); });
        }
        await page.evaluate(() => window.openQuizPreviewModal({ title: 'Matching layout', questions: [{ type: 'Matching Type', question: 'Match each type.', points: 10, pairs: [{ premise: 'int', target: 'Whole numbers' }, { premise: 'float', target: 'Decimals' }] }] }));
        for (const width of [1200, 390]) {
            await page.setViewportSize({ width, height: 800 });
            const bank = await page.locator('.sigma-quiz-matching-bank').boundingBox();
            const rows = await page.locator('.sigma-quiz-matching-rows').boundingBox();
            assert.ok(bank && rows);
            await page.evaluate(() => {
                const source = document.querySelector('.sigma-quiz-matching-bank > div:last-child > div');
                window.startQuizChoiceDragVisual({ currentTarget: source, clientX: 100, clientY: 200, dataTransfer: new DataTransfer() }, 'Whole numbers');
            });
            assert.equal(await page.locator('.sigma-quiz-choice-drag-visual').evaluate(el => getComputedStyle(el).opacity), '1');
            assert.equal(await page.locator('.sigma-quiz-choice-dragging > span').evaluate(el => getComputedStyle(el).visibility), 'hidden');
            await page.evaluate(() => window.endQuizChoiceDragVisual());
            assert.equal(await page.locator('.sigma-quiz-choice-drag-visual').count(), 0);
            if (width === 1200) assert.ok(bank.x >= rows.x + rows.width, 'Desktop choice bank is right of matching rows');
            else assert.ok(bank.y + bank.height <= rows.y + 1, 'Mobile choice bank remains above matching rows');
        }
        console.log('PASS: quiz scrolling and responsive matching layout');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
