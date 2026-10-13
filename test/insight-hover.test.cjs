const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        for (const width of [375, 1280]) {
            await page.setViewportSize({ width, height: 800 });
            await page.setContent('<div class="sigma-rail-header"><button class="sigma-analyze-button"></button><button class="sigma-analyze-button sigma-insight-mark-all"></button><button class="sigma-insight-search-toggle"></button></div>');
            await page.addStyleTag({ path: 'css/sigma-analytics.css' });
            for (const selector of ['.sigma-analyze-button', '.sigma-insight-mark-all', '.sigma-insight-search-toggle']) {
                const button = page.locator(selector).first();
                await button.hover();
                const styles = await button.evaluate(element => {
                    const css = getComputedStyle(element);
                    return [css.borderRadius, css.width === css.height, css.backgroundColor];
                });
                assert.deepEqual(styles, ['50%', true, 'rgb(241, 245, 249)']);
            }
        }
        console.log('PASS: circular grey hover highlights on desktop and mobile.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
