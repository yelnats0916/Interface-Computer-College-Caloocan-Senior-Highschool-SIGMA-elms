const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
    const source = fs.readFileSync(path.join(__dirname, '../js/sigma-analytics.js'), 'utf8');
    const start = source.indexOf('    window.toggleMobileGradebookSummary =');
    const handler = source.slice(start, source.indexOf('    window.setSigmaGradebookView =', start));
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 390, height: 700 } });
        await page.setContent('<style>body{margin:0;font-family:Arial}table{width:100%;color:white}th{background:#15803d;padding:16px}td{color:black;padding:12px}.gb-detail-table:not(.gb-detail-summary) .summary,.gb-detail-summary .assessment{display:none}</style><section class="sigma-grades-page"><div class="gb-detail-workspace"><div class="gb-mobile-view-switch" role="group" aria-label="Gradebook display"><button data-mobile-assessment-view="assessments" aria-pressed="true" onclick="setMobileAssessmentView(this,false)">Assessments</button><button data-mobile-assessment-view="summary" aria-pressed="false" onclick="setMobileAssessmentView(this,true)">Summary</button></div><table class="gb-detail-table"><thead><tr><th>Written Works<br>Component (30%)</th><th class="assessment">Task 1<br>HPS: 100 pts</th><th class="summary">Total<br>255 pts</th><th class="summary">% Score</th></tr></thead><tbody><tr><td>Dela Cruz, Juan Abad</td><td class="assessment">70</td><td class="summary">115</td><td class="summary">45.10%</td></tr></tbody></table></div></section>');
        await page.addStyleTag({ path: path.join(__dirname, '../css/sigma-analytics.css') });
        await page.evaluate(() => {
            document.querySelector('.gb-detail-workspace').classList.add('gb-summary-workspace');
            document.querySelector('table').id = 'admin-gradebook-spreadsheet';
            document.querySelector('[data-mobile-assessment-view=assessments]').remove();
            const button = document.querySelector('[data-mobile-assessment-view=summary]');
            button.setAttribute('onclick', 'toggleMobileGradebookSummary(this)');
            button.innerHTML = '<span>Summary</span><span class="gb-summary-icon" aria-hidden="true"><i class="fa-solid fa-plus"></i><i class="fa-solid fa-chevron-down"></i></span>';
            button.insertAdjacentHTML('beforebegin', '<div class="gb-mobile-status-key gb-status-key"><span>Missing</span><span>Absent</span><span>Incomplete</span><span>Excuse</span></div>');
        });
        await page.addScriptTag({ content: 'window.sigmaGradesState={};' + handler });
        for (const width of [320, 390, 768]) {
            await page.setViewportSize({ width, height: 700 });
            assert.equal(await page.locator('.gb-mobile-view-switch').isVisible(), true);
            await page.getByRole('button', { name: 'Summary', exact: true }).click();
            assert.equal(await page.getByRole('button', { name: 'Summary', exact: true }).getAttribute('aria-pressed'), 'true');
            await page.waitForTimeout(200);
            assert.equal(await page.locator('.gb-summary-icon .fa-chevron-down').evaluate(el => getComputedStyle(el).opacity), '1');
            assert.equal(await page.locator('.gb-mobile-view-switch button').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
            assert.equal(await page.locator('.gb-mobile-view-switch button').evaluate(el => getComputedStyle(el).color), 'rgb(0, 0, 0)');
            const alignment = await page.locator('.gb-mobile-view-switch').evaluate(row => {
                const bounds = row.getBoundingClientRect(), button = row.querySelector('button').getBoundingClientRect();
                return { start: (button.left - bounds.left) / bounds.width, width: button.width / bounds.width };
            });
            assert.ok(alignment.width < .4 && Math.abs(alignment.start + alignment.width - 1) < .01, 'Compact Summary aligns right beside the full legend');
            const attachment = await page.locator('.gb-mobile-view-switch button').evaluate(button => {
                const table = button.closest('.gb-summary-workspace').querySelector('table');
                const style = getComputedStyle(button);
                return { gap: table.getBoundingClientRect().top - button.getBoundingClientRect().bottom, bottomRadius: style.borderBottomLeftRadius, bottomBorder: style.borderBottomWidth };
            });
            assert.ok(Math.abs(attachment.gap) < 1, 'Summary attaches directly to the table');
            assert.equal(attachment.bottomRadius, '0px');
            assert.equal(attachment.bottomBorder, '0px');
            assert.equal(await page.locator('th.summary').first().isVisible(), true);
            assert.equal(await page.locator('th.assessment').isVisible(), false);
            await page.getByRole('button', { name: 'Summary', exact: true }).click();
            assert.equal(await page.getByRole('button', { name: 'Summary', exact: true }).getAttribute('aria-pressed'), 'false');
            assert.equal(await page.locator('th.assessment').isVisible(), true);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        }
        await page.evaluate(() => { const table = document.querySelector('table'); table.classList.remove('gb-detail-table'); table.classList.add('gb-overview-table'); });
        await page.getByRole('button', { name: 'Summary', exact: true }).click();
        assert.equal(await page.locator('table').evaluate(el => el.classList.contains('gb-totals-expanded')), true);
        await page.getByRole('button', { name: 'Summary', exact: true }).click();
        assert.equal(await page.locator('table').evaluate(el => el.classList.contains('gb-totals-expanded')), false);
        await page.setViewportSize({ width: 1200, height: 800 });
        assert.equal(await page.locator('.gb-mobile-view-switch').isVisible(), false);
        console.log('PASS: mobile view selector, selected state, summary/assessment switching, responsive fit, desktop hidden.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
