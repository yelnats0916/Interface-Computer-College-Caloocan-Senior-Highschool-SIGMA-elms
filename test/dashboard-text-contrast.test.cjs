const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        const paths = [...fs.readFileSync('student.html', 'utf8').matchAll(/href="(css\/[^"?]+)(?:\?[^\"]*)?"/g)].map(match => match[1]);
        const classes = ['home-dashboard-card__title', 'home-dashboard-assessment-btn', 'home-dashboard-subject-link', 'home-dashboard-card__meta', 'home-dashboard-card__time'];
        for (const width of [375, 1280]) {
            await page.setViewportSize({ width, height: 800 });
            await page.setContent('<div class="home-dashboard-card home-dashboard-card--class"><span class="home-dashboard-panel-title">Next Class</span>' + classes.map(name => `<span class="${name}">Dashboard text</span>`).join('') + '</div><div class="home-dashboard-card"><span class="home-dashboard-subject-label--meta">Subject subtitle</span><span class="home-dashboard-card__time home-dashboard-card__time--upcoming">No Due Date</span><p class="home-dashboard-empty-text">No Due Submissions</p></div>');
            for (const path of paths) await page.addStyleTag({ path });
            await page.mouse.move(width - 1, 799);
            await page.waitForTimeout(250);
            for (const name of classes) assert.equal(await page.locator('.home-dashboard-card--class .' + name).evaluate(element => getComputedStyle(element).color), 'rgb(0, 0, 0)', `${name} at ${width}px`);
            assert.equal(await page.locator('.home-dashboard-panel-title').evaluate(element => getComputedStyle(element).color), 'rgb(21, 128, 61)');
            for (const selector of ['.home-dashboard-subject-label--meta', '.home-dashboard-card__time--upcoming', '.home-dashboard-empty-text']) {
                assert.equal(await page.locator(selector).evaluate(element => getComputedStyle(element).color), 'rgba(0, 0, 0, 0.45)');
            }
            for (const name of ['home-dashboard-assessment-btn', 'home-dashboard-subject-link']) {
                await page.locator('.' + name).hover();
                await page.waitForTimeout(250);
                assert.equal(await page.locator('.' + name).evaluate(element => getComputedStyle(element).color), 'rgb(255, 208, 0)', `${name} retains yellow hover at ${width}px`);
            }
        }
        console.log('PASS: dashboard titles and body text black on desktop/mobile; section headings remain green.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
