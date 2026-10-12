const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.goto('http://127.0.0.1:5519/quiz-creator.html');
        await page.waitForFunction(() => typeof window.openSigmaQuestionUpload === 'function');
        await page.evaluate(() => {
            window.uploadCalls = [];
            window.processAIGenFile = file => window.uploadCalls.push(['generate', file.name]);
            window.processImportedFile = file => window.uploadCalls.push(['import', file.name]);
        });
        for (const width of [390, 1280]) {
            await page.setViewportSize({ width, height: 960 });
            const styles = [];
            const cardStyles = [];
            for (const [prefix, modalId] of [['ai-gen', 'ai-generator-modal'], ['import', 'import-questions-modal']]) {
                await page.evaluate(({ prefix, modalId }) => {
                    document.getElementById(modalId).classList.remove('hidden');
                    if (prefix === 'ai-gen') window.applySwitchAIGenSourceOption('upload');
                }, { prefix, modalId });
                const zone = page.locator('#' + prefix + '-dropzone');
                await zone.scrollIntoViewIfNeeded();
                await page.waitForTimeout(250);
                styles.push(await zone.evaluate(el => {
                    const s = getComputedStyle(el), icon = getComputedStyle(el.querySelector('.sigma-question-upload-icon'));
                    return { padding: s.padding, radius: s.borderRadius, gap: s.gap, iconWidth: icon.width, title: getComputedStyle(el.querySelector('.sigma-question-upload-title')).fontSize, meta: getComputedStyle(el.querySelector('.sigma-question-upload-meta')).fontSize };
                }));
                await zone.screenshot({ path: path.join(process.env.TEMP, `sigma-${prefix}-dropzone-${width}.png`) });
                await zone.evaluate(el => {
                    const transfer = new DataTransfer();
                    transfer.items.add(new File(['Existing questions'], 'questions.txt', { type: 'text/plain' }));
                    el.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: transfer }));
                    if (!el.classList.contains('is-dragging')) throw new Error('Missing drag highlight');
                    el.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
                });
                assert.equal(await zone.evaluate(el => el.classList.contains('is-dragging')), false);
                const chooser = page.waitForEvent('filechooser');
                await zone.focus();
                await page.keyboard.press('Enter');
                await (await chooser).setFiles({ name: 'browsed.txt', mimeType: 'text/plain', buffer: Buffer.from('Questions') });
                const card = page.locator('#' + prefix + '-uploaded-file-card');
                await page.evaluate(prefix => {
                    const file = new File(['Questions'], 'questions.pdf', { type: 'application/pdf' });
                    if (prefix === 'ai-gen') window.displayAIGenUploadedFileCard(file);
                    else window.displayImportUploadedFileCard(file);
                }, prefix);
                assert.equal(await card.isVisible(), true);
                cardStyles.push(await card.evaluate(el => {
                    const s = getComputedStyle(el), icon = getComputedStyle(el.querySelector('[id$="-file-icon-wrap"]'));
                    return { padding: s.padding, radius: s.borderRadius, icon: icon.width, title: getComputedStyle(el.querySelector('.sigma-file-panel-title')).fontSize, meta: getComputedStyle(el.querySelector('.sigma-file-panel-meta')).fontSize };
                }));
                await page.locator('#' + modalId).screenshot({ path: path.join(process.env.TEMP, `sigma-${prefix}-upload-${width}.png`) });
                await page.evaluate(({ prefix, modalId }) => {
                    document.getElementById(prefix + '-uploaded-file-card').classList.add('hidden');
                    document.getElementById(prefix + '-dropzone').classList.remove('hidden');
                    document.getElementById(modalId).classList.add('hidden');
                }, { prefix, modalId });
            }
            assert.deepEqual(styles[0], styles[1]);
            assert.deepEqual(cardStyles[0], cardStyles[1]);
        }
        const calls = await page.evaluate(() => window.uploadCalls);
        assert.deepEqual(calls, [390, 1280].flatMap(() => [['generate', 'questions.txt'], ['generate', 'browsed.txt'], ['import', 'questions.txt'], ['import', 'browsed.txt']]));
        assert.match(await page.locator('#ai-gen-file-input').getAttribute('accept'), /image\/\*/);
        assert.doesNotMatch(await page.locator('#import-file-input').getAttribute('accept'), /image|video/);
        const source = fs.readFileSync(path.join(__dirname, '../js/quiz-creator.js'), 'utf8');
        assert.match(source, /25 \* 1024 \* 1024 : 10 \* 1024 \* 1024/);
        assert.match(source, /file.size > 10 \* 1024 \* 1024/);
        console.log('PASS: matching upload styles, shared browse/drop/keyboard behavior, separate processors and unchanged file restrictions.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
