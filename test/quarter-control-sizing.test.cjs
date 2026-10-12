const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
        const quarters = ['1st', '2nd', '3rd', '4th'];
        const buttons = [1, 3].map(q => `<button><span class="sigma-quarter-long">${quarters[q - 1]} Quarter</span><span class="sigma-quarter-short">Q${q}</span></button>`).join('');
        await page.setContent(`<div class="sigma-grades-page"><div id="admin-grades-quarters-wrapper" data-quarter-count="2"><div>${buttons}</div></div></div><div data-release-quarter-toggle>${buttons}</div>`);
        for (const css of ['forms.css', 'shared-components.css', 'sigma-analytics.css', 'mobile.css']) await page.addStyleTag({ path: path.join(__dirname, '../css', css) });
        await page.addStyleTag({ content: 'html,body{min-width:0!important;margin:0!important;width:100%!important}.sigma-grades-page{min-width:0!important;width:100%!important}' });
        for (const button of await page.locator('button').all()) {
            assert.equal(await button.evaluate(el => getComputedStyle(el).height), '48px');
            assert.match(await button.innerText(), /Quarter/);
        }
        for (const width of [320, 390, 768]) {
            await page.setViewportSize({ width, height: 800 });
            for (const container of await page.locator('#admin-grades-quarters-wrapper, [data-release-quarter-toggle]').all()) {
                assert.equal(await container.locator('button').count(), 2);
                assert.deepEqual(await container.locator('button').allInnerTexts(), ['Q1', 'Q3']);
            }
            assert.equal(await page.locator('#admin-grades-quarters-wrapper button').first().evaluate(el => getComputedStyle(el).height), '30px');
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        }
        await page.setContent('<div id="subject-topics-quarter-pills"></div><div id="subject-materials-quarter-pills"></div>');
        for (const css of ['shared-components.css', 'mobile.css']) await page.addStyleTag({ path: path.join(__dirname, '../css', css) });
        const source = fs.readFileSync(path.join(__dirname, '../js/subject-editor.js'), 'utf8');
        const render = source.slice(source.indexOf('window.renderSubjectQuarterTabs = function'), source.indexOf('window.setSubjectTopicQuarter = function'));
        await page.evaluate(code => {
            const getActiveSubjectQuarters = () => ['q1', 'q3'];
            const QUARTER_LABELS = { q1: '1st Quarter', q3: '3rd Quarter' };
            eval(code);
            window.renderSubjectQuarterTabs();
        }, render);
        for (const width of [390, 1200]) {
            await page.setViewportSize({ width, height: 800 });
            for (const container of await page.locator('#subject-topics-quarter-pills, #subject-materials-quarter-pills').all()) {
                assert.deepEqual(await container.locator('button').allInnerTexts(), width < 769 ? ['Q1', 'Q3'] : ['1st Quarter', '3rd Quarter']);
                assert.equal(await container.locator('button').first().getAttribute('aria-label'), '1st Quarter');
            }
        }
        console.log('PASS: shared desktop sizing, compact mobile Q labels, configured quarter subsets, no horizontal overflow.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
