const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        const page = await browser.newPage();
        const cards = [1, 2, 3].map(n => '<article class="sigma-card--insight"><button class="sigma-insight-open" onclick="openStudentInsight(this)"><span>Insight ' + n + '</span></button><button class="sigma-card-pin-btn" title="Pin to top" onclick="this.classList.toggle(\'is-pinned\')">Pin</button><template class="sigma-insight-full-content"><p>Content ' + n + '</p></template><div class="sigma-card-date">October 10</div></article>').join('');
        for (const width of [1200, 390, 320]) {
            await page.setViewportSize({ width, height: 700 });
            await page.setContent('<div id="analytics-dropdown"><div id="analytics-dropdown-cards" style="height:100px;overflow:auto">' + cards + '<div style="height:400px"></div></div></div>');
            await page.addStyleTag({ path: path.join(__dirname, '../css/sigma-analytics.css') });
            await page.addStyleTag({ content: '.hidden{display:none!important} body{margin:0}' });
            await page.addScriptTag({ path: path.join(__dirname, '../js/student-insight-view.js') });
            await page.locator('.sigma-insight-open').first().click();
            assert.equal(await page.locator('.sigma-insight-position').textContent(), '1 of 3');
            assert.equal(await page.getByRole('button', { name: 'Previous insight' }).isDisabled(), true);
            assert.equal(await page.locator('#analytics-dropdown').isVisible(), width > 768);
            await page.getByRole('button', { name: 'Next insight' }).click();
            assert.equal(await page.locator('#sigma-insight-detail-title').textContent(), 'Insight 2');
            assert.equal(await page.locator('.sigma-insight-detail-text').textContent(), 'Content 2');
            await page.locator('.sigma-insight-detail-pin').click();
            assert.equal(await page.locator('.sigma-card-pin-btn').nth(1).evaluate(node => node.classList.contains('is-pinned')), true);
            await page.getByRole('button', { name: 'Next insight' }).click();
            assert.equal(await page.getByRole('button', { name: 'Next insight' }).isDisabled(), true);
            await page.getByRole('button', { name: 'Previous insight' }).click();
            assert.equal(await page.locator('.sigma-insight-position').textContent(), '2 of 3');
            const bounds = await page.locator('dialog').boundingBox();
            if (width <= 768) assert.deepEqual(bounds, { x: 0, y: 0, width, height: 700 });
            else assert.ok(bounds.width < width && bounds.height < 700);
            const buttons = await page.locator('.sigma-insight-navigation button').all();
            for (const button of buttons) {
                const box = await button.boundingBox();
                assert.ok(box.x >= 0 && box.x + box.width <= width);
            }
            await page.screenshot({ path: path.join(os.tmpdir(), 'sigma-insight-navigation-' + width + '.png') });
            await page.getByRole('button', { name: width <= 768 ? 'Back' : 'Close insight', exact: true }).click();
            await page.waitForFunction(() => !document.querySelector('dialog').open);
            assert.equal(await page.locator('#analytics-dropdown').isVisible(), true);
            await page.locator('.sigma-card--insight').nth(2).evaluate(node => node.remove());
            await page.locator('.sigma-card--insight').nth(1).evaluate(node => node.remove());
            await page.locator('.sigma-insight-open').click();
            assert.equal(await page.locator('.sigma-insight-navigation').isVisible(), true);
            assert.equal(await page.getByRole('button', { name: 'Previous insight' }).isDisabled(), true);
            assert.equal(await page.getByRole('button', { name: 'Next insight' }).isDisabled(), true);
            assert.equal(await page.locator('.sigma-insight-position').textContent(), '1 of 1');
        }
        console.log('Insight navigation passed: desktop/mobile, bounds, Next/Previous, pinning, return and single insight.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
