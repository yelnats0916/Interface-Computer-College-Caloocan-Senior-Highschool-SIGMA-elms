const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.setContent('<div id="example-modal"><div class="curriculum-hub-panel"><div class="border-b"><div><h2>Modal title</h2><p data-subtitle>Header description</p></div></div><div><h3>Body section</h3><p data-body>Keep instructions</p></div></div></div><div class="sigma-modal-header"><h2>Shared header</h2><p data-subtitle>Shared subtitle</p></div><div id="section-modal-header-container"><h2>Section title</h2><p data-subtitle>Section subtitle</p></div>');
        await page.addStyleTag({ path: path.join(__dirname, '../css/shared-components.css') });
        await page.evaluate(() => {
            const nested = document.createElement('div');
            nested.className = 'curriculum-release-panel-fixed';
            nested.innerHTML = '<div id="example-borrow-view"><div class="border-b"><h2>Nested header</h2><p data-subtitle>Nested description</p></div><div><p data-body>Nested body instruction</p></div></div>';
            document.body.append(nested);
        });
        for (const width of [390, 1200]) {
            await page.setViewportSize({ width, height: 800 });
            for (const subtitle of await page.locator('[data-subtitle]').all()) assert.equal(await subtitle.isVisible(), false);
            for (const body of await page.locator('[data-body]').all()) assert.equal(await body.isVisible(), true);
            assert.equal(await page.getByRole('heading', { name: 'Modal title', exact: true }).isVisible(), true);
        }
        await page.goto('http://127.0.0.1:5519/quiz-creator.html');
        assert.equal(await page.locator('#ai-generator-main-view').getByText('Describe your lesson topic or upload reference materials', { exact: false }).count(), 0);
        assert.equal(await page.getByText('Search and select Senior High materials to ground your quiz generation.', { exact: true }).count(), 0);
        for (const width of [390, 1200]) {
            await page.setViewportSize({ width, height: 900 });
            for (const id of ['ai-generator-modal', 'import-questions-modal', 'open-quiz-library-modal', 'save-quiz-metadata-modal', 'download-quiz-modal']) {
                const modal = page.locator('#' + id);
                await modal.evaluate(el => {
                    el.classList.remove('hidden');
                    for (const view of el.querySelectorAll('#ai-generator-main-view, #ai-generator-borrow-view')) view.classList.remove('hidden');
                });
                assert.ok(await modal.locator('.sigma-modal-header').count() > 0);
                for (const subtitle of await modal.locator('.sigma-modal-header p').all()) assert.equal(await subtitle.isVisible(), false, id + ': ' + await subtitle.innerText());
                await modal.evaluate(el => el.classList.add('hidden'));
            }
            await page.locator('#ai-discard-modal').evaluate(el => el.classList.remove('hidden'));
            assert.equal(await page.locator('#discard-modal-desc').isVisible(), true);
            await page.locator('#ai-discard-modal').evaluate(el => el.classList.add('hidden'));
        }
        console.log('PASS: mobile/desktop modal header subtitles hidden, titles and body instructions retained, AI generator subtitle removed.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
