const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const source = fs.readFileSync(path.join(__dirname, '../js/student.js'), 'utf8');
const start = source.indexOf('        if (isDetailView && !window._suppressSubmissionScrollToTop)');
const end = source.indexOf('        if (window._studentSubmissionMode', start);
const scrollBehavior = source.slice(start, end);
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
        await page.route('http://fixture.test/**', route => route.fulfill({ body: '<html></html>', contentType: 'text/html' }));
        await page.goto('http://fixture.test/student.html#topic-content:test:0:assessments:0');
        await page.addScriptTag({ path: path.join(__dirname, '../js/shared-components.js') });
        await page.evaluate(code => {
            document.body.innerHTML = '<div id="section-topic-content" style="height:4000px"><p id="updated">Original</p></div>';
            window._renderTopicContentMain = new Function(`const isDetailView = true; const _scrollX = window.scrollX; const _scrollY = window.scrollY; document.getElementById('updated').textContent = 'Refreshed'; ${code}`);
        }, scrollBehavior);
        for (const width of [1200, 375]) {
            await page.setViewportSize({ width, height: 800 });
            await page.evaluate(() => { window.scrollTo(0, 900); window.dispatchEvent(new Event('focus')); });
            await page.waitForTimeout(180);
            assert.equal(await page.evaluate(() => window.scrollY), 900);
            assert.equal(await page.locator('#updated').innerText(), 'Original');
            assert.equal(await page.evaluate(() => Boolean(window._suppressSubmissionScrollToTop)), false);
        }
        await page.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'sigma-assessment-scored-broadcast', newValue: '{}' })));
        await page.waitForTimeout(180);
        assert.equal(await page.locator('#updated').innerText(), 'Refreshed');
        assert.equal(await page.evaluate(() => window.scrollY), 900);
        // Explicit navigation still resets to the top.
        await page.evaluate(() => window._renderTopicContentMain());
        await page.waitForTimeout(100);
        assert.equal(await page.evaluate(() => window.scrollY), 0);
        console.log('PASS: focus causes no re-render; real score changes refresh without scroll jumps; navigation starts at top');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
