const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.route('**/offline-assessment-test', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }));
        await page.goto('http://127.0.0.1:5519/offline-assessment-test');
        for (const file of ['css/forms.css', 'css/shared-components.css', 'css/sigma-analytics.css']) {
            await page.evaluate(css => { const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style); },
                fs.readFileSync(path.join(__dirname, '..', file), 'utf8'));
        }
        await page.evaluate(() => {
            localStorage.removeItem('sigma-offline-assessments-v1');
            window.sigmaGradesState = { currentView: 'pt', activeQuarter: 1,
                selectedSubjectSection: { subject: 'Test Programming', sectionName: 'Test Section' } };
            window.renderAdminGradebookWorkspace = () => {};
            window.getStudentFullAliases = student => [student.id];
        });
        await page.addScriptTag({ path: path.join(__dirname, '../js/offline-assessments.js') });
        for (const width of [1440, 390]) {
            await page.setViewportSize({ width, height: 900 });
            await page.evaluate(() => window.openOfflineAssessmentForm());
            const dateText = await page.locator('[data-context]').textContent();
            assert.ok(!dateText.includes('Test Programming') && !dateText.includes('Performance Tasks'));
            const expectedDate = await page.evaluate(() => new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric' }));
            assert.equal(dateText, expectedDate);
            await page.locator('[name=title]').fill(`Practical ${width}`);
            for (const invalid of ['0', '101', '1.5']) {
                await page.locator('[name=hps]').fill(invalid);
                assert.equal(await page.locator('[name=hps]').evaluate(input => input.checkValidity()), false);
            }
            await page.locator('[name=hps]').fill('100');
            assert.equal(await page.locator('[name=hps]').evaluate(input => input.checkValidity()), true);
            await page.locator('[name=hps]').fill('80');
            const box = await page.locator('#offline-assessment-modal .sigma-modal-panel').boundingBox();
            assert.ok(box && box.width <= width, 'Modal must fit desktop/mobile');
            assert.ok(box.width <= 460 && box.height < 600, 'Modal must remain compact');
            await page.screenshot({ path: path.join(process.env.TEMP, `sigma-offline-modal-${width}.png`) });
            await page.locator('#offline-assessment-modal button[type=submit]').click();
            assert.equal(await page.locator('#offline-assessment-modal').count(), 0);
        }
        const results = await page.evaluate(() => {
            const records = window.getOfflineAssessments('Test Programming', 'Test Section', 1, 'perf. task');
            const cell = document.createElement('td');
            cell.dataset.itemId = records[0].id; cell.dataset.studentId = 'student-test';
            document.body.appendChild(cell); window.editOfflineAssessmentScore(cell);
            const counter = cell.querySelector('input');
            for (const [raw, expected] of [['999', '80'], ['-1', '0'], ['1.5', '1']]) {
                counter.value = raw; counter.dispatchEvent(new Event('input'));
                if (counter.value !== expected) throw Error('Manual counter limit failed');
            }
            cell.querySelector('input').value = '60'; cell.querySelector('input').blur();
            return { ids: records.map(item => item.id), date: records[0].date,
                first: window.readOfflineAssessmentScore({ id: 'student-test' }, records[0]),
                second: window.readOfflineAssessmentScore({ id: 'student-test' }, records[1]),
                otherSection: window.getOfflineAssessments('Test Programming', 'Other', 1, 'perf. task').length };
        });
        assert.notEqual(results.ids[0], results.ids[1]);
        assert.equal(results.first, 60); assert.equal(results.second, null); assert.equal(results.otherSection, 0);
        assert.ok(results.date);
        await page.evaluate(() => localStorage.removeItem('sigma-offline-assessments-v1'));
        console.log('PASS: title/HPS modal fits desktop/mobile, scoped permanent IDs and independent scores.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
