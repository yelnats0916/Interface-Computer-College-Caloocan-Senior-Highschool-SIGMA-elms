const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.setContent('<button class="sigma-resubmit-action-btn sigma-resubmit-action-btn--allow">Resubmit</button>');
        await page.addStyleTag({ path: require('node:path').join(__dirname, '../css/shared-components.css') });
        for (const width of [1200, 375]) {
            await page.setViewportSize({ width, height: 800 });
            await page.locator('button').hover();
            await page.waitForTimeout(200);
            const style = await page.locator('button').evaluate(element => {
                const css = getComputedStyle(element);
                return { background: css.backgroundColor, decoration: css.textDecorationLine };
            });
            assert.equal(style.background, 'rgb(229, 231, 235)');
            assert.equal(style.decoration, 'none');
        }
        console.log('PASS: Resubmit grey hover without underline at desktop/mobile widths.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
