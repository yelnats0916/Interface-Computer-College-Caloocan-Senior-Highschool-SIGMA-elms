const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        for (const portal of ['admin', 'teacher', 'student']) {
            for (const width of [390, 1200]) {
                const page = await browser.newPage({ viewport: { width, height: 800 } });
                await page.goto(`http://127.0.0.1:5519/${portal}.html`);
                await page.evaluate(() => {
                    document.body.innerHTML = `<div id="section-topic-content"><div class="grading-student-avatar-wrap"><div class="sigma-user-avatar sigma-user-avatar--xs"></div></div></div><article class="sigma-announcement-card"><div class="sigma-card-author-meta"><div><div class="sigma-user-avatar sigma-user-avatar--md"></div></div><div class="sigma-card-author-text-col">Name</div></div></article><div class="sigma-user-avatar sigma-user-avatar--lg"></div><button class="header-profile-btn"></button><div class="notif-item__avatar"></div><div class="mobile-sidebar-avatar-wrap"></div><div class="profile-panel-avatar-wrap"></div>`;
                });
                const sizes = await page.locator('.sigma-user-avatar, .header-profile-btn, .notif-item__avatar, .mobile-sidebar-avatar-wrap, .grading-student-avatar-wrap').evaluateAll(nodes => nodes.map(n => [getComputedStyle(n).width, getComputedStyle(n).height]));
                const expected = width < 769 ? '34px' : '38px';
                sizes.forEach(size => assert.deepEqual(size, [expected, expected], `${portal} ${width}`));
                await page.screenshot({ path: `test/avatar-sizes-${portal}-${width}.png` });
                await page.close();
            }
        }
        console.log('PASS: common avatars and wrappers are 38px desktop / 34px mobile in all three portals');
    } finally { await browser.close(); }
})();
