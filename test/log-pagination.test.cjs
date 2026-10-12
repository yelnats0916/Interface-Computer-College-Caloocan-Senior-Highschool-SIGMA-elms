const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    const screenshots = fs.mkdtempSync(path.join(os.tmpdir(), 'sigma-log-pagination-'));
    try {
        const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
        await page.route('http://sigma.test/**', route => route.fulfill({ body: '<html></html>', contentType: 'text/html' }));
        await page.goto('http://sigma.test/');
        const ids = ['audit-ai-view', 'audit-activity-view', 'audit-auth-view', 'audit-notifications-view', 'settings-recovery-view'];
        const rows = Array.from({ length: 205 }, (_, index) => `<tr><td>Record ${index}${index === 42 || index === 204 ? ' findme' : ''}</td><td><button data-record="${index}">Open</button></td></tr>`).join('');
        await page.setContent('<style>body{margin:0;padding:16px;font-family:Arial}.hidden{display:none}table{width:100%}td{padding:6px}</style>' + ids.map(id => `<section id="${id}" class="dynamic-section hidden"><div><table class="sigma-audit-table" aria-label="${id}"><tbody>${rows}</tbody></table></div></section>`).join(''));
        for (const css of ['forms.css', 'shared-components.css', 'admin.css', 'log-pagination.css']) await page.addStyleTag({ path: path.join(root, 'css', css) });
        await page.addScriptTag({ path: path.join(root, 'js/log-pagination.js') });
        for (const id of ids) {
            await page.evaluate(id => { document.querySelectorAll('section').forEach(section => section.classList.toggle('hidden', section.id !== id)); }, id);
            const section = page.locator('#' + id);
            assert.equal(await section.locator('tbody tr:visible').count(), 20);
            assert.equal(await section.locator('tbody tr').count(), 20, 'Only current page rows belong in the DOM');
            const selected = section.getByRole('button', { name: 'Page 1', exact: true });
            assert.equal(await selected.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(21, 128, 61)', 'Selected page stays green without hover');
            await selected.hover();
            assert.equal(await selected.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(21, 128, 61)', 'Hover must not override the selected page');
            const aligned = await section.locator('.sigma-log-pagination').evaluate(nav => {
                const count = nav.querySelector('.sigma-log-page-count').getBoundingClientRect();
                const controls = nav.querySelector('.sigma-log-page-controls').getBoundingClientRect();
                const button = nav.querySelector('button'), bounds = button.getBoundingClientRect();
                return { centers: Math.abs(count.y + count.height / 2 - controls.y - controls.height / 2), width: bounds.width, height: bounds.height, radius: parseFloat(getComputedStyle(button).borderRadius), padding: getComputedStyle(nav).paddingLeft };
            });
            assert.ok(aligned.centers < 1, 'Count and buttons share the same vertical center');
            assert.equal(aligned.width, aligned.height, 'Buttons stay circular');
            assert.ok(aligned.radius >= aligned.width / 2);
            assert.equal(aligned.padding, '24px');
            const next = section.getByRole('button', { name: 'Next page', exact: true });
            assert.equal(await next.evaluate(el => getComputedStyle(el).borderTopWidth), '0px', 'Chevrons have no visible border');
            assert.equal(await next.evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)', 'Chevrons use a transparent background');
            await next.hover();
            await page.waitForTimeout(180);
            assert.equal(await next.evaluate(el => getComputedStyle(el).color), 'rgb(0, 0, 0)', 'Chevron stays black on hover');
            assert.equal(await next.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(241, 245, 249)', 'Chevron hover is neutral, not green');
            await section.getByRole('button', { name: 'Next page', exact: true }).click();
            assert.match(await section.locator('tbody tr:visible').first().textContent(), /Record 20/);
            await section.getByRole('button', { name: 'Page 11', exact: true }).click();
            assert.equal(await section.locator('tbody tr:visible').count(), 5);
            assert.equal(await section.getByRole('button', { name: 'Next page', exact: true }).isDisabled(), true);
            await page.evaluate(id => {
                const table = document.querySelector('#' + id + ' table');
                SigmaLogPagination.filter(table, 'findme');
            }, id);
            assert.equal(await section.locator('tbody tr:visible').count(), 2);
            assert.equal(await section.locator('.sigma-log-pagination').isHidden(), true);
            await page.evaluate(id => {
                const table = document.querySelector('#' + id + ' table');
                SigmaLogPagination.filter(table, '');
            }, id);
        }
        await page.evaluate(() => {
            const table = document.createElement('table'); table.className = 'sigma-audit-table ai-log-history-table'; table.setAttribute('aria-label', 'Detail history');
            table.innerHTML = '<tbody>' + Array.from({ length: 41 }, (_, i) => `<tr><td>Detail ${i}</td><td>Success</td></tr>`).join('') + '</tbody>';
            document.getElementById('settings-recovery-view').append(table);
        });
        await page.waitForFunction(() => document.querySelector('.ai-log-history-table + .sigma-log-pagination'));
        assert.equal(await page.locator('.ai-log-history-table tbody tr:visible').count(), 20);
        await page.evaluate(() => {
            window.rowRenderCount = 0;
            const records = Array.from({ length: 10001 }, (_, id) => ({ id, label: 'Lazy record ' + id }));
            SigmaLogPagination.setRecords(document.querySelector('.ai-log-history-table'), records, record => {
                window.rowRenderCount++;
                const row = document.createElement('tr');
                const label = document.createElement('td'), action = document.createElement('td');
                label.textContent = record.label; action.textContent = 'Open'; row.append(label, action);
                return row;
            });
        });
        assert.equal(await page.evaluate(() => window.rowRenderCount), 20, 'Unvisited pages must not create rows');
        assert.equal(await page.locator('.ai-log-history-table tbody tr').count(), 20);
        await page.locator('.ai-log-history-table + .sigma-log-pagination').getByRole('button', { name: 'Next page', exact: true }).click();
        assert.equal(await page.evaluate(() => window.rowRenderCount), 40);
        assert.equal(await page.locator('.ai-log-history-table tbody tr').count(), 20);
        await page.evaluate(() => SigmaLogPagination.filter(document.querySelector('.ai-log-history-table'), 'Lazy record 10000'));
        assert.equal(await page.locator('.ai-log-history-table tbody tr').count(), 1);
        assert.match(await page.locator('.ai-log-history-table tbody').textContent(), /Lazy record 10000/);
        await page.evaluate(() => SigmaLogPagination.filter(document.querySelector('.ai-log-history-table'), ''));
        for (const width of [1200, 390, 320]) {
            await page.setViewportSize({ width, height: 900 });
            await page.locator('#settings-recovery-view > div .sigma-log-pagination').getByRole('button', { name: 'Page 11', exact: true }).click();
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Pagination fits at ' + width);
            await page.screenshot({ path: path.join(screenshots, `pagination-${width}.png`), fullPage: true });
        }
        console.log('PASS: all log categories and dynamically added detail tables, 20-row pages, full-data filters, last-page clamping, single-page controls hidden, desktop/mobile sizing. Screenshots: ' + screenshots);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
