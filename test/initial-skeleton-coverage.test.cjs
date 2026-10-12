const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        for (const width of [390, 1200]) {
            const page = await browser.newPage({ viewport: { width, height: 800 } });
            await page.setContent(`<main id="main-content">
                <div id="panel" class="standard-panel-shadow" style="height:120px"><p>Content</p></div>
                <div id="question" class="active-question-card" style="height:120px"><p>Question</p></div>
                <table id="table"><tbody><tr><td>Grade</td></tr></tbody></table>
                <div role="dialog"><div id="dialog" class="standard-panel-shadow"><p>Dialog</p></div></div>
                <div class="header-panel"><div id="dropdown" class="standard-panel-shadow"><p>Dropdown</p></div></div>
            </main>`);
            await page.addStyleTag({ path: 'css/page-skeleton.css' });
            await page.evaluate(() => document.documentElement.classList.add('sigma-initial-loading'));
            for (const id of ['panel', 'question', 'table']) {
                const state = await page.locator(`#${id}`).evaluate(el => ({
                    hidden: getComputedStyle(el.firstElementChild).visibility,
                    animation: getComputedStyle(el, '::after').animationName,
                    height: el.getBoundingClientRect().height
                }));
                assert.equal(state.hidden, 'hidden');
                assert.equal(state.animation, 'sigma-sweep-band');
                assert.ok(state.height > 0);
            }
            for (const id of ['dialog', 'dropdown']) {
                assert.equal(await page.locator(`#${id} p`).evaluate(el => getComputedStyle(el).visibility), 'visible');
            }
            await page.addScriptTag({ path: 'js/page-skeleton.js' });
            await page.waitForFunction(() => !document.documentElement.classList.contains('sigma-initial-loading'));
            assert.equal(await page.locator('#question p').evaluate(el => getComputedStyle(el).visibility), 'visible');
            await page.evaluate(() => {
                document.documentElement.classList.add('sigma-initial-loading');
                window.pendingInitial = SigmaPageLoading.waitForInitial(() => new Promise(resolve => { window.finishInitial = resolve; }));
            });
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            assert.equal(await page.evaluate(() => document.documentElement.classList.contains('sigma-initial-loading')), true,
                'Keep the original skeleton while actual initialization is pending');
            await page.evaluate(() => window.finishInitial());
            await page.waitForFunction(() => !document.documentElement.classList.contains('sigma-initial-loading'));
            await page.close();
        }
        console.log('PASS: mobile/desktop surfaces shimmer, overlays excluded, initial state clears');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
