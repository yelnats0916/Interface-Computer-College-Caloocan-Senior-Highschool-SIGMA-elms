const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
        await page.route('**/php/api/**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: [], logs: [], states: {}, tables: [], records: [] }) }));
        await page.goto('http://127.0.0.1:5519/admin.html#nav-users-accounts');
        await page.waitForFunction(() => typeof window.renderUserAccountsTable === 'function');
        await page.waitForTimeout(1000);
        await page.evaluate(() => {
            localStorage.setItem('sigma-admin-users', JSON.stringify(Array.from({ length: 41 }, (_, index) => ({
                uid: 'page-test-' + index, name: 'Page User ' + index, role: 'Student', status: 'Active',
                email: 'page' + index + '@example.test', createdAt: '2026-10-11T00:00:00Z'
            }))));
            window.userAccountSearchState = {};
            window.userPaginationState.currentPage = 1;
            window.renderUserAccountsTable();
        });
        const rows = page.locator('#userTableBody tr');
        assert.equal(await rows.count(), 20);
        const firstPage = await rows.first().textContent();
        await page.evaluate(() => window.onUserPageChange(2));
        assert.equal(await rows.count(), 20);
        assert.notEqual(await rows.first().textContent(), firstPage);
        await page.evaluate(() => window.onUserPageChange(3));
        assert.equal(await rows.count(), 1, 'Last page must not contain filler rows');
        await page.evaluate(() => {
            localStorage.setItem('sigma-admin-users', JSON.stringify(JSON.parse(localStorage.getItem('sigma-admin-users')).slice(0, 4)));
            window.renderUserAccountsTable();
        });
        assert.equal(await rows.count(), 4);
        assert.equal(await page.evaluate(() => window.userPaginationState.currentPage), 1, 'Shrink results must clamp the selected page');
        assert.equal(await page.locator('#user-pagination-container button').count(), 0);
        for (const id of ['user-pagination-container', 'section-pagination-container', 'subject-pagination-container', 'school-year-pagination-container']) {
            assert.equal(await page.locator('#' + id).evaluate(el => getComputedStyle(el.parentElement).paddingBottom), '24px', id + ': bottom breathing room remains with pagination hidden');
        }
        for (const [render, id] of [['renderSectionsTable', 'sectionTableBody'], ['renderSubjectsTable', 'subjectTableBody'], ['renderSchoolYearTable', 'schoolYearTableBody']]) {
            await page.evaluate(render => {
                if (render === 'renderSchoolYearTable') renderSchoolYearTable();
                else window[render]();
            }, render);
            assert.equal(await page.locator('#' + id + ' tr').evaluateAll(rows => rows.some(row => row.cells.length > 1 && !row.textContent.trim())), false, id + ': no blank filler rows');
        }
        console.log('PASS: current-page-only account rows, partial last pages, shrinking results, hidden single-page controls, and no school table filler rows.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
