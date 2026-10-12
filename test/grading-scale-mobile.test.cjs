const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { chromium } = require('playwright');
const shared = fs.readFileSync(path.join(__dirname, '../js/shared-components.js'), 'utf8');
const analytics = fs.readFileSync(path.join(__dirname, '../js/sigma-analytics.js'), 'utf8');
const tableStart = analytics.indexOf('    const DEPED_TRANSMUTATION_TABLE =');
const tableEnd = analytics.indexOf('    // Standard DepEd', tableStart);
const methodStart = analytics.indexOf('        getTransmutationRows()');
const methodEnd = analytics.indexOf('        transmute(', methodStart);
const context = vm.createContext({});
vm.runInContext(analytics.slice(tableStart, tableEnd) + 'this.engine = {' + analytics.slice(methodStart, methodEnd) + '};', context);
const rows = context.engine.getTransmutationRows();
assert.equal(rows.length, 41);
assert.equal(rows.find(row => row.grade === 65).min, 20);
const start = shared.indexOf('window.openGradingScale = function');
const closeStart = shared.indexOf('window.closeGradingScale = function');
const fn = shared.slice(closeStart, shared.indexOf('\n};', closeStart) + 4) + shared.slice(start, shared.indexOf('\n};', start) + 4);
const renderer = name => {
    const offset = shared.indexOf(`window.${name} = function`);
    return shared.slice(offset, shared.indexOf('\n};', offset) + 4);
};
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        for (const width of [320, 390, 1200]) {
            const page = await browser.newPage({ viewport: { width, height: 700 } });
            await page.setContent('<div class="canonical-tabs-bar"><button id="open" aria-controls="sigma-grading-scale" onclick="window.openGradingScale(this)">Grading Scale</button></div><aside id="navigation">Navigation</aside><main id="topic-content-main"><div id="assessments">Assessments</div></main>');
            await page.evaluate(rows => { window.SigmaGradeEngine = { getTransmutationRows: () => rows }; }, rows);
            await page.addStyleTag({ path: path.join(__dirname, '../css/forms.css') });
            await page.addStyleTag({ path: path.join(__dirname, '../css/shared-components.css') });
            await page.addStyleTag({ content: '@media(max-width:767px){#topic-content-main:not(:has(.topic-videos-list-container)):not(:has(.assessment-material-detail-view)){padding-left:14px!important;padding-right:14px!important;box-sizing:border-box!important;}}' });
            await page.addScriptTag({ content: fn });
            await page.addScriptTag({ content: renderer('renderCanonicalTopHeaderTabBarHtml') + renderer('renderTopicContentTabBarHtml') });
            await page.evaluate(() => {
                document.querySelector('.canonical-tabs-bar').outerHTML = window.renderTopicContentTabBarHtml({ currentTab: 'assessments' });
                document.querySelector('[data-canonical-tab="grading-scale"]').id = 'open';
                window.switchTopicTab = () => {};
            });
            await page.addStyleTag({ content: '.canonical-tabs-bar{overflow-x:auto}.canonical-tabs-bar nav{display:flex;width:max-content}.canonical-tab-btn{white-space:nowrap;flex-shrink:0;padding:12px}' });
            assert.equal(await page.locator('.canonical-tab-btn').count(), 4);
            assert.equal(await page.locator('#open i.fa-table-list').count(), 1);
            assert.equal((await page.locator('#open').textContent()).trim(), '');
            assert.equal(await page.locator('#open').getAttribute('aria-label'), 'Grading Scale');
            const iconBox = await page.locator('#open').boundingBox();
            const barBox = await page.locator('.canonical-tabs-bar').boundingBox();
            assert.ok(Math.abs(iconBox.x + iconBox.width - barBox.x - barBox.width) < 1);
            const assessmentBox = await page.locator('[data-canonical-tab="assessments"]').boundingBox();
            assert.equal(iconBox.y, assessmentBox.y);
            assert.ok(iconBox.y + iconBox.height <= barBox.y + barBox.height + 1);
            await page.locator('.canonical-tabs-scroll').evaluate(el => { el.scrollLeft = el.scrollWidth; });
            const scrolledIconBox = await page.locator('#open').boundingBox();
            assert.equal(scrolledIconBox.x, iconBox.x);
            assert.equal(await page.locator('#open i').evaluate(el => getComputedStyle(el).color), 'rgb(0, 0, 0)');
            await page.click('#open');
            await page.waitForTimeout(200);
            assert.equal(await page.locator('#open i').evaluate(el => getComputedStyle(el).color), 'rgb(21, 128, 61)');
            assert.equal(await page.locator('.canonical-tab-btn.active').count(), 1);
            assert.equal(await page.locator('#open').getAttribute('aria-current'), 'page');
            assert.equal(await page.locator('#sigma-grading-scale tbody tr').count(), 41);
            assert.equal(await page.locator('#sigma-grading-scale h2').count(), 0);
            assert.equal(await page.locator('#sigma-grading-scale th').count(), 3);
            assert.equal(await page.locator('#sigma-grading-scale table.sigma-table').count(), 1);
            const borders = await page.locator('#sigma-grading-scale').evaluate(el => {
                const style = selector => getComputedStyle(el.querySelector(selector));
                return [style('th:nth-child(2)').borderRightColor, style('td:nth-child(2)').borderRightColor, style('th:first-child').borderRightWidth, style('td:first-child').borderRightWidth];
            });
            assert.deepEqual(borders, ['rgb(19, 118, 56)', 'rgba(0, 0, 0, 0.08)', '0px', '0px']);
            const evenCells = page.locator('#sigma-grading-scale tbody tr:nth-child(2) td');
            const backgrounds = () => evenCells.evaluateAll(cells => cells.map(cell => getComputedStyle(cell).backgroundColor));
            await page.locator('#open').hover();
            assert.deepEqual(await backgrounds(), Array(3).fill('rgb(248, 250, 252)'));
            for (let column = 0; column < 3; column++) {
                await evenCells.nth(column).hover();
                await page.waitForTimeout(150);
                assert.deepEqual(await backgrounds(), [0, 1, 2].map(index => index === column ? 'rgb(241, 245, 249)' : 'rgb(248, 250, 252)'));
            }
            await page.locator('#open').hover();
            await page.waitForTimeout(150);
            assert.deepEqual(await backgrounds(), Array(3).fill('rgb(248, 250, 252)'));
            assert.equal(await page.locator('#assessments').isVisible(), false);
            assert.equal(await page.locator('#navigation').isVisible(), true);
            const box = await page.locator('#sigma-grading-scale').boundingBox();
            assert.ok(box.x >= 0 && box.x + box.width <= width);
            if (width < 768) {
                const mainBox = await page.locator('#topic-content-main').boundingBox();
                assert.equal(box.x, mainBox.x);
                assert.equal(box.width, mainBox.width);
            }
            assert.ok(await page.locator('#sigma-grading-scale').evaluate(el => el.scrollWidth <= el.clientWidth));
            await page.screenshot({ path: path.join(__dirname, `grading-scale-${width}.png`) });
            await page.click('#open');
            assert.equal(await page.locator('#sigma-grading-scale').count(), 1);
            await page.click('[data-canonical-tab="assessments"]');
            await page.waitForTimeout(200);
            assert.equal(await page.locator('#sigma-grading-scale').count(), 0);
            assert.equal(await page.locator('#open i').evaluate(el => getComputedStyle(el).color), 'rgb(0, 0, 0)');
            assert.equal(await page.locator('[data-canonical-tab="assessments"]').getAttribute('aria-current'), 'page');
            assert.equal(await page.locator('#assessments').isVisible(), true);
            if (width < 768) assert.equal(await page.locator('#topic-content-main').evaluate(el => getComputedStyle(el).paddingLeft), '14px');
            await page.close();
        }
    } finally { await browser.close(); }
    console.log('PASS: four shared tabs, black/green scale icon, stable selection, 41 rows, mobile width and hover');
})().catch(error => { console.error(error); process.exitCode = 1; });
