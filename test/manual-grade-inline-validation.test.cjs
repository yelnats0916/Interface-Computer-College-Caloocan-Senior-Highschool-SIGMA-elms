const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.setContent('<div><div><button id="teacher-grading-status-trigger-btn">Status</button></div></div><div><div><input id="teacher-grading-score-input"></div></div>');
        await page.addScriptTag({ path: path.join(__dirname, '../js/shared-components.js') });
        await page.evaluate(() => window.showManualGradeValidation(true, true));
        assert.equal(await page.locator('#manual-grade-score-error').textContent(), 'Enter a score.');
        assert.equal(await page.locator('#manual-grade-status-error').textContent(), 'Select a status.');
        await page.evaluate(() => window.showManualGradeValidation(false, true));
        assert.equal(await page.locator('#manual-grade-score-error').isVisible(), false);
        assert.equal(await page.locator('#manual-grade-status-error').isVisible(), true);
        await page.evaluate(() => window.showManualGradeValidation(false, false));
        assert.equal(await page.locator('#manual-grade-status-error').isVisible(), false);
        console.log('PASS: separate inline score/status messages clear when fields are valid');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
