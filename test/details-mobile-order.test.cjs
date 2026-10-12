const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.setContent('<style>.assessment-material-details-grid{display:grid;grid-template-columns:1fr;gap:20px}section{height:60px}@media(min-width:768px){.assessment-material-details-grid{grid-template-columns:1fr 1fr}.assessment-mobile-score-panel-slot{display:none}}</style><div class="assessment-material-details-grid"><section class="assessment-mobile-score-panel-slot">Score</section><section class="assessment-grading-details-card">Grading</section><section class="assessment-submission-details-card">Submission</section></div>');
        await page.addStyleTag({ path: require('node:path').join(__dirname, '../css/shared-components.css') });
        for (const width of [375, 767, 768, 1200]) {
            await page.setViewportSize({ width, height: 800 });
            const grading = await page.locator('.assessment-grading-details-card').boundingBox();
            const submission = await page.locator('.assessment-submission-details-card').boundingBox();
            if (width < 768) {
                const score = await page.locator('.assessment-mobile-score-panel-slot').boundingBox();
                assert.ok(score.y < submission.y && submission.y < grading.y);
            } else {
                assert.equal(grading.y, submission.y);
                assert.ok(grading.x < submission.x);
            }
        }
        console.log('PASS: mobile Score/Submission/Grading order; desktop Grading/Submission unchanged.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
