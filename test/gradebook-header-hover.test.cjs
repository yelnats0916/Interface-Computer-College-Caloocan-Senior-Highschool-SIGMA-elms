const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1200, height: 600 } });
        await page.setContent('<style>body{font-family:Arial}th{height:64px;width:260px;background:#15803d;color:white}</style><div class="sigma-grades-page"><table id="admin-gradebook-spreadsheet"><thead><tr>' + ['Written Works (%)', 'Performance Task (%)', 'Quarterly Assessment (%)'].map(label => `<th class="gb-component-header"><button class="gb-component-cell-button" aria-label="${label}"></button><span>${label}</span></th>`).join('') + '</tr></thead></table></div><button class="sigma-btn sigma-btn-primary">Shared button</button>');
        for (const file of ['forms.css', 'sigma-analytics.css']) await page.addStyleTag({ path: path.join(__dirname, '../css', file) });
        const shared = page.getByRole('button', { name: 'Shared button' });
        await shared.hover();
        await page.waitForTimeout(200);
        const expected = await shared.evaluate(el => getComputedStyle(el).backgroundColor);
        for (const header of await page.locator('th').all()) {
            await header.hover();
            await page.waitForTimeout(200);
            assert.equal(await header.evaluate(el => getComputedStyle(el).backgroundColor), expected);
            await page.mouse.move(1100, 500);
            await page.waitForTimeout(200);
            assert.equal(await header.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(21, 128, 61)');
            await header.locator('button').focus();
            await page.waitForTimeout(200);
            assert.equal(await header.evaluate(el => getComputedStyle(el).backgroundColor), expected);
            await header.locator('button').evaluate(el => el.blur());
        }
        await page.locator('th').first().hover();
        await page.waitForTimeout(200);
        await page.screenshot({ path: 'C:/Users/stanl/AppData/Local/Temp/sigma-gradebook-header-hover.png' });
        console.log('PASS: all breakdown headers match shared green button hover and keyboard focus; mouse leave restores green.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
