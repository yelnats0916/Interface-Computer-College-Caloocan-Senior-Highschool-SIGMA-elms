const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
        const errors = [];
        page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
        const quiz = {
            id: 9301, code: '#QZ-9301', title: 'QZ-9301', authorId: '0000000', authorName: 'Fixture Admin', authorRole: 'Admin',
            questionsCount: 2, totalPoints: 10,
            quizQuestions: JSON.stringify([
                { id: 'one', type: 'Multiple Choice', question: 'Which type stores true or false?', choices: ['Boolean', 'Integer'], answer: 'Boolean', points: 5 },
                { id: 'two', type: 'Short Answer', question: 'Explain a data type.', answers: ['Char'], points: 5 }
            ])
        };
        await page.route('**/php/api/**', async route => {
            if (route.request().url().includes('quiz_library.php')) {
                await new Promise(resolve => setTimeout(resolve, 300));
                await route.fulfill({ json: { success: true, quizzes: [quiz] } });
            } else await route.abort();
        });
        await page.goto('http://127.0.0.1:5519/quiz-creator.html?new=1');
        await page.waitForFunction(() => window._quizLibraryServerData?.length === 1);
        await page.evaluate(() => {
            window.openQuizLibraryModal();
            window.selectQuizInLibraryModal(9301);
        });
        await page.locator('#lib-modal-action-btn').click();
        await page.waitForFunction(() => document.getElementById('sidebar-question-count-badge')?.textContent.includes('2 /'));
        assert.equal(new URL(page.url()).searchParams.get('id'), '9301');
        for (const width of [1200, 390]) {
            await page.setViewportSize({ width, height: 800 });
            await page.evaluate(() => {
                const content = document.createElement('div');
                content.id = 'creator-scroll-fixture';
                content.style.height = '2000px';
                document.getElementById('questions-thumbnails-container').append(content);
            });
            assert.equal(await page.locator('#questions-thumbnails-container').evaluate(el => getComputedStyle(el).overflowY), 'visible', 'Question Deck does not own a nested scrollbar');
            const editorBefore = await page.locator('#quiz-editor-workspace').boundingBox();
            const deckBefore = await page.locator('#questions-sidebar-wrap').boundingBox();
            await page.mouse.move(width / 2, 500);
            await page.mouse.wheel(0, 500);
            await page.waitForTimeout(200);
            assert.ok(await page.evaluate(() => window.scrollY) > 0, 'Creator main page handles scrolling');
            if (width >= 1024) {
                const editorAfter = await page.locator('#quiz-editor-workspace').boundingBox();
                const deckAfter = await page.locator('#questions-sidebar-wrap').boundingBox();
                assert.ok(Math.abs(editorAfter.y - 96) < 2, 'Desktop editor stays beneath the header while scrolling');
                assert.ok(deckAfter.y < deckBefore.y - 100, 'Right Question Deck moves with page scrolling');
            }
            await page.evaluate(() => { document.getElementById('creator-scroll-fixture').remove(); window.scrollTo(0, 0); });
        }
        await page.setViewportSize({ width: 1200, height: 800 });
        await page.evaluate(() => window.openStudentQuizPreviewModal());
        await page.locator('#student-preview-modal').waitFor({ state: 'visible' });
        assert.match(await page.locator('#student-preview-modal').innerText(), /Which type stores true or false/);
        assert.equal(await page.locator('#student-preview-counter .sigma-quiz-total').innerText(), 'Total Points: 10');
        assert.equal(await page.locator('#student-preview-counter .sigma-quiz-question-points').innerText(), '5 Points');
        await page.evaluate(() => {
            const content = document.createElement('div');
            content.id = 'preview-header-scroll-fixture';
            content.style.height = '2000px';
            document.getElementById('student-preview-questions-list').append(content);
            document.getElementById('student-preview-modal').scrollTop = 500;
        });
        const counterBox = await page.locator('#student-preview-counter').boundingBox();
        assert.ok(counterBox.y >= 0 && counterBox.y < 250, 'Preview points and question numbers remain visible while scrolling');
        await page.evaluate(() => {
            document.getElementById('preview-header-scroll-fixture').remove();
            document.getElementById('student-preview-modal').scrollTop = 0;
        });
        assert.equal(await page.locator('#student-preview-counter .sigma-quiz-points-summary > span').first().getAttribute('class'), 'sigma-quiz-total font-bold text-sm');
        for (const width of [1200, 390]) {
            await page.setViewportSize({ width, height: 800 });
            const numbers = await page.locator('#preview-question-pills-strip button').evaluateAll(buttons => buttons.map(button => {
                const rect = button.getBoundingClientRect();
                return { width: rect.width, height: rect.height, radius: getComputedStyle(button).borderRadius };
            }));
            assert.equal(numbers.length, 2);
            if (width === 390) {
                const points = await page.locator('#student-preview-counter').boundingBox();
                const pills = await page.locator('#preview-question-pills-strip').boundingBox();
                assert.ok(pills.y >= points.y + points.height, 'Mobile question numbers occupy their own row below points');
                assert.equal(await page.locator('#preview-question-pills-strip').evaluate(el => getComputedStyle(el).flexWrap), 'nowrap');
                assert.equal(await page.locator('#student-preview-quiz-title').evaluate(el => getComputedStyle(el).fontSize), '16px');
                assert.equal(await page.locator('#student-preview-counter .sigma-quiz-total').evaluate(el => getComputedStyle(el).fontSize), '12px');
                assert.ok(await page.locator('#preview-footer-next-btn').evaluate(el => Math.abs(parseFloat(getComputedStyle(el).height) - 36) < 1));
                assert.equal(await page.locator('#preview-footer-next-btn').evaluate(el => getComputedStyle(el).fontSize), '12px');
                const footer = await page.locator('#student-preview-modal-footer').boundingBox();
                assert.ok(Math.abs(footer.y + footer.height - 800) < 2, 'Short mobile questions keep footer at viewport bottom');
            }
            numbers.forEach(button => {
                assert.equal(button.width, button.height);
                assert.equal(button.radius, '50%');
            });
            assert.equal(await page.locator('#preview-question-pills-strip button').first().evaluate(el => el.classList.contains('bg-[#FFD000]')), true);
        }
        await page.evaluate(() => window.nextPreviewQuestion());
        assert.match(await page.locator('#student-preview-modal').innerText(), /Explain a data type/);
        const response = page.locator('#preview-text-input-1');
        await response.fill('c');
        assert.equal(await page.locator('#preview-text-status-1').innerText(), '');
        assert.equal(await page.locator('#preview-text-answers-1').innerText(), '');
        await response.press('Enter');
        assert.match(await page.locator('#preview-text-status-1').innerText(), /Incorrect/);
        await response.fill('Char');
        assert.equal(await page.locator('#preview-text-status-1').innerText(), '');
        await response.blur();
        assert.match(await page.locator('#preview-text-status-1').innerText(), /Correct/);
        await page.reload();
        await page.waitForFunction(() => document.getElementById('sidebar-question-count-badge')?.textContent.includes('2 /'));
        await page.evaluate(() => window.openStudentQuizPreviewModal());
        await page.locator('#student-preview-modal').waitFor({ state: 'visible' });
        assert.match(await page.locator('#student-preview-modal').innerText(), /Which type stores true or false/);
        assert.deepEqual(errors, []);
        console.log('PASS: server-only library Load, numeric quiz ID, serialized questions, preview and refresh');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
