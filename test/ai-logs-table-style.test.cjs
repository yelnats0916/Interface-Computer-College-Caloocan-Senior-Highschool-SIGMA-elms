const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
        for (const file of ['admin.html', 'php/admin.php']) {
            const source = fs.readFileSync(path.join(root, file), 'utf8');
            const start = source.indexOf('<!-- AI Logs Table -->');
            const table = source.slice(start, source.indexOf('</table>', start) + 8);
            assert.ok(table.includes('sigma-table-container'));
            assert.ok(table.includes('class="sigma-table sigma-audit-table"'));
            assert.equal(table.includes('tracking-[0.2em]'), false);
            assert.equal(table.includes('hover:bg-slate-50'), false);
            assert.ok(table.includes('No AI logs yet.'));
            assert.equal(table.includes('John Doe'), false);
            assert.equal(table.includes('Alice Smith'), false);
            assert.equal(table.includes('>JD</div>'), false);
            assert.equal(table.includes('>AS</div>'), false);
            await page.setContent(table + '</div>');
            await page.evaluate(() => {
                document.querySelector('tbody').innerHTML = '<tr><td><span class="ai-log-user-name">Test User</span></td><td>Test request</td><td>Test provider</td><td>Not recorded</td><td>Test timestamp</td></tr>';
            });
            await page.addStyleTag({ path: path.join(root, 'css/admin.css') });
            await page.addStyleTag({ path: path.join(root, 'css/forms.css') });
            for (const heading of await page.locator('th').all()) {
                assert.equal(await heading.evaluate(node => getComputedStyle(node).textAlign), 'center');
            }
            for (const heading of await page.locator('th:not(:last-child)').all()) {
                assert.equal(await heading.evaluate(node => getComputedStyle(node).borderRightWidth), '1px');
            }
            assert.equal(await page.locator('th').last().evaluate(node => getComputedStyle(node).borderRightWidth), '0px');
            assert.deepEqual(await page.locator('th').allTextContents(), ['User', 'AI Feature', 'Model', 'Status', 'Timestamp']);
            assert.equal(await page.locator('tbody td:nth-child(4)').first().textContent(), 'Not recorded');
            for (const cell of await page.locator('tbody td:nth-child(2), tbody td:nth-child(3)').all()) {
                assert.equal(await cell.evaluate(node => getComputedStyle(node).borderRightWidth), '1px');
            }
            for (const cell of await page.locator('tbody td:nth-child(3), tbody td:nth-child(4), tbody td:nth-child(5)').all()) {
                assert.equal(await cell.evaluate(node => getComputedStyle(node).textAlign), 'center');
            }
            for (const cell of await page.locator('tbody td:nth-child(1), tbody td:nth-child(2)').all()) {
                assert.equal(await cell.evaluate(node => getComputedStyle(node).textAlign), 'left');
            }
            const header = await page.locator('th').first().evaluate(node => {
                const s = getComputedStyle(node); return { size: s.fontSize, padding: s.padding, weight: s.fontWeight, transform: s.textTransform };
            });
            assert.deepEqual(header, { size: '13px', padding: '14px 20px', weight: '600', transform: 'none' });
            const cell = await page.locator('td').first().evaluate(node => ({ padding: getComputedStyle(node).padding, size: getComputedStyle(node).fontSize }));
            assert.deepEqual(cell, { padding: '16px 20px', size: '14px' });
            const userName = await page.locator('.ai-log-user-name').first().evaluate(node => {
                const style = getComputedStyle(node);
                return { size: style.fontSize, weight: style.fontWeight };
            });
            assert.deepEqual(userName, { size: '14px', weight: '400' });
            assert.ok((await page.locator('td').first().boundingBox()).width >= 280);
            await page.locator('tbody td').first().hover();
            await page.waitForFunction(() => getComputedStyle(document.querySelector('tbody td')).backgroundColor === 'rgb(241, 245, 249)');
            assert.equal(await page.locator('tbody td').first().evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(241, 245, 249)');
        }
        for (const file of ['admin.html', 'php/admin.php']) {
            const source = fs.readFileSync(path.join(root, file), 'utf8');
            for (const [label, headings] of [
                ['Activity', ['Admin / User', 'Action', 'Module', 'Timestamp']],
                ['Authentication', ['User', 'Event', 'IP / Device', 'Timestamp']]
            ]) {
                const start = source.indexOf(`<!-- ${label} Logs Table -->`);
                const table = source.slice(start, source.indexOf('</table>', start) + 8);
                assert.ok(table.includes('sigma-table-container'));
                assert.ok(table.includes('class="sigma-table sigma-audit-table"'));
                assert.equal(table.includes('font-bold text-black'), false);
                assert.equal((table.match(/fa-solid fa-user text-xs/g) || []).length, 2);
                await page.setContent(table + '</div>');
                await page.addStyleTag({ path: path.join(root, 'css/admin.css') });
                await page.addStyleTag({ path: path.join(root, 'css/forms.css') });
                assert.deepEqual(await page.locator('th').allTextContents(), headings);
                for (const heading of await page.locator('th').all()) {
                    assert.equal(await heading.evaluate(node => getComputedStyle(node).textAlign), 'center');
                }
                for (const cell of await page.locator('tbody td:not(:last-child)').all()) {
                    assert.equal(await cell.evaluate(node => getComputedStyle(node).borderRightWidth), '1px');
                }
                const name = await page.locator('tbody td:first-child p').first().evaluate(node => {
                    const s = getComputedStyle(node); return { size: s.fontSize, weight: s.fontWeight };
                });
                assert.deepEqual(name, { size: '14px', weight: '400' });
                assert.ok((await page.locator('td').first().boundingBox()).width >= 280);
                for (const cell of await page.locator('tbody td:nth-child(n+3)').all()) {
                    assert.equal(await cell.evaluate(node => getComputedStyle(node).textAlign), 'center');
                }
                for (const width of [1200, 600, 390, 320]) {
                    await page.setViewportSize({ width, height: 800 });
                    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
                    assert.equal(await page.locator('.sigma-table-container').evaluate(node => getComputedStyle(node).overflowX), 'auto');
                    assert.ok((await page.locator('table').boundingBox()).width >= 960);
                    for (const cell of await page.locator('tbody td').all()) {
                        assert.equal(await cell.evaluate(node => node.scrollWidth <= node.clientWidth + 1), true);
                    }
                }
                await page.setViewportSize({ width: 1200, height: 800 });
            }
        }
        console.log('All audit log tables use shared typography, profile icons, spacing and dividers in static and PHP pages.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
