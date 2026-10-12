const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        for (const portal of ['admin', 'teacher']) {
        const page = await browser.newPage();
        await page.setContent('<div id="topic-dropdown-0"><div class="sigma-black-fade-panel"><div class="mat-card-left"><div class="material-panel-icon-group mat-icon-col"><div class="mat-icon-box"><i class="fa-solid fa-circle-play text-red-600"></i></div><span class="mat-type-badge text-red-600">Video</span></div><div>Understanding Syntax and Data Types</div></div></div></div>');
        for (const css of [portal + '.css', 'forms.css', 'tailwind.css', 'shared-components.css', 'mobile.css']) await page.addStyleTag({ path: path.join(__dirname, '../css', css) });
        for (const width of [320, 390, 768, 1200]) {
            await page.setViewportSize({ width, height: 800 });
            await page.waitForTimeout(300);
            const styles = await page.locator('.mat-icon-box').evaluate(el => {
                const icon = el.querySelector('i'), badge = el.parentElement.querySelector('span');
                return { size: getComputedStyle(el).width, icon: getComputedStyle(icon).fontSize, weight: getComputedStyle(icon, '::before').fontWeight, badge: getComputedStyle(badge).fontSize, color: getComputedStyle(badge).color };
            });
            assert.deepEqual(styles, { size: width < 769 ? '36px' : '44px', icon: width < 769 ? '18px' : '22px', weight: '900', badge: width < 769 ? '10px' : '12px', color: 'rgb(220, 38, 38)' });
        }
        await page.close();
        }
        console.log('PASS: compact mobile material icons and labels retain desktop solid glyphs and badge colors; desktop sizing unchanged.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
