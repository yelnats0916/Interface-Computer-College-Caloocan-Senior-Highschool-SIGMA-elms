const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        for (const portal of ['admin', 'teacher', 'student']) {
        const page = await browser.newPage();
        const html = fs.readFileSync(path.join(__dirname, '../' + portal + '.html'), 'utf8');
        const start = html.indexOf('<div class="calendar-page-month-nav');
        await page.setContent(html.slice(start, html.indexOf('<!-- Hidden Selects', start)));
        for (const css of [portal + '.css', 'tailwind.css', 'calendar.css', 'mobile.css']) await page.addStyleTag({ path: path.join(__dirname, '../css', css) });
        await page.addStyleTag({ content: 'html,body{min-width:0!important;margin:0!important}.calendar-page-month-nav{width:252px;margin:24px;position:relative}' });
        await page.locator('#attendance-page-month-picker').evaluate(el => {
            el.classList.remove('hidden');
            el.textContent = '2026';
        });
        for (const width of [320, 390, 768, 1200]) {
            await page.setViewportSize({ width, height: 900 });
            const bounds = await page.locator('#attendance-page-month-picker').evaluate(el => {
                const rect = el.getBoundingClientRect(), anchor = el.parentElement.getBoundingClientRect();
                return { offset: (rect.left + rect.right - anchor.left - anchor.right) / 2, gap: rect.top - anchor.bottom, left: rect.left, right: rect.right };
            });
            assert.ok(Math.abs(bounds.offset) < 1, portal + ': centered on navigation');
            const expectedGap = width <= 768 ? 6 : 8;
            assert.ok(bounds.gap >= expectedGap - 1 && bounds.gap <= expectedGap);
            assert.ok(bounds.left >= 0 && bounds.right <= width);
        }
        await page.close();
        }
        console.log('PASS: actual calendar-page picker centered on navigation in all portals, mobile and desktop.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
