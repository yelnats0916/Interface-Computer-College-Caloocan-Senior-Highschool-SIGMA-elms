const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        for (const role of ['teacher', 'student', 'admin']) {
            const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
            await page.route('http://fixture.test/**', route => route.fulfill({
                body: '<html><body></body></html>', contentType: 'text/html'
            }));
            await page.goto(`http://fixture.test/${role}.html`);
            const source = fs.readFileSync(path.join(root, `${role}.html`), 'utf8');
            for (const match of source.matchAll(/href="(css\/[^"?]+\.css)/g)) {
                await page.addStyleTag({ path: path.join(root, match[1]) });
            }
            await page.addScriptTag({ path: path.join(root, 'js/shared-components.js') });
            await page.evaluate(() => {
                const html = window.renderSharedAssessmentsTabHtml({
                    tab: 'assessments', assessments: [{ id: 'test', title: 'Task Test', type: 'assignment', maxScore: 100 }],
                    activeIdx: 0, subjectId: 'test', topicIdx: 0, role: 'teacher', section: 'Rizal'
                });
                const section = document.createElement('div');
                section.id = 'section-topic-content';
                section.innerHTML = `<div class="teacher-topic-page-grid is-detail-view"><div id="topic-content-main">${html}</div><div id="topic-right-section" class="teacher-topic-progress-rail"></div></div>`;
                document.body.replaceChildren(section);
                window.relocateAssessmentPrimaryAction(section);
            });
            for (const width of [375, 767, 1200, 375]) {
                await page.setViewportSize({ width, height: 667 });
                await page.evaluate(() => new Promise(requestAnimationFrame));
                const position = await page.evaluate(() => {
                    const comments = document.querySelector('.shared-private-comments');
                    const panels = [...document.querySelectorAll('.assessment-material-main-card, .assessment-material-details-grid, #sigma-ai-feedback-panel')];
                    const feedback = document.querySelector('#sigma-ai-feedback-panel');
                    const details = document.querySelector('.assessment-material-details-grid');
                    return {
                        commentsTop: comments.getBoundingClientRect().top,
                        panelsBottom: Math.max(...panels.map(panel => panel.getBoundingClientRect().bottom)),
                        feedbackTop: feedback?.getBoundingClientRect().top,
                        detailsBottom: details?.getBoundingClientRect().bottom,
                        parent: comments.parentElement.id
                    };
                });
                if (width < 768) {
                    assert.ok(position.commentsTop >= position.panelsBottom, `${role}: ${JSON.stringify(position)}`);
                    assert.ok(position.feedbackTop >= position.detailsBottom, `${role}: feedback precedes details ${JSON.stringify(position)}`);
                }
                else assert.equal(position.parent, 'topic-right-section');
            }
            await page.close();
        }
        console.log('PASS: real assessment panels precede comments on mobile across all role styles and resizing');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
