const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const root = path.join(__dirname, '..');
        const source = fs.readFileSync(path.join(root, 'js/teacher.js'), 'utf8');
        const start = source.indexOf('    window.toggleTeacherScoreEditor = function');
        const end = source.indexOf('    window.closeTeacherScoreEditor =', start);
        const page = await browser.newPage();
        for (const width of [1200, 375]) {
            await page.setViewportSize({ width, height: 800 });
            await page.setContent('<button id="teacher-grading-score-edit" onclick="window.toggleTeacherScoreEditor()">Edit</button><span id="teacher-grading-score-display">-</span><input id="teacher-grading-score-input" type="number" min="0" max="55" data-is-quiz="1" data-has-quiz-submission="0" data-needs-submission="0" style="display:none">');
            for (const match of fs.readFileSync(path.join(root, 'teacher.html'), 'utf8').matchAll(/href="(css\/[^"?]+\.css)/g)) await page.addStyleTag({ path: path.join(root, match[1]) });
            await page.addScriptTag({ content: 'window.setTeacherScoreEditSelected = () => {}; window.closeTeacherScoreEditor = () => {};' + source.slice(start, end) });
            await page.locator('#teacher-grading-score-edit').click();
            assert.equal(await page.locator('#teacher-grading-score-input').isVisible(), true);
            await page.locator('#teacher-grading-score-input').fill('25');
            assert.equal(await page.locator('#teacher-grading-score-input').inputValue(), '25');
            assert.equal(await page.locator('#teacher-grading-score-display').isVisible(), false);
        }
        console.log('PASS: actual teacher pencil handler opens editable score input on desktop and mobile');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
