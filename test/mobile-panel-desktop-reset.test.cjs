const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const source = fs.readFileSync(path.join(__dirname, '../js/topbar.js'), 'utf8');
const controller = source.slice(source.indexOf('    window.openMobileAccountPanel ='), source.indexOf('    // Back button in mobile panel header'));

(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        for (const role of ['student', 'teacher']) {
            const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
            await page.setContent(`<style>.hidden{display:none}</style><header id="${role}-header"></header>` +
                ['noti', 'calendar', 'analytics', 'schedule', 'profile', 'sigma'].map(name =>
                    `<button id="mobile-subbar-${name}" class="mobile-subbar-btn"></button>`).join('') +
                ['noti-dropdown', 'calendar-dropdown', 'analytics-dropdown', 'schedule-dropdown', 'profileDropdownMenu', 'sigmaAiPanel'].map(id =>
                    `<div id="${id}" class="hidden">Panel</div>`).join(''));
            await page.evaluate(() => { window.revisitActivePanel = () => {}; });
            await page.addScriptTag({ content: controller });
            for (const panel of ['analytics', 'schedule', 'noti', 'calendar', 'sigma', 'profile', 'account']) {
                await page.setViewportSize({ width: 390, height: 844 });
                await page.evaluate(name => name === 'account' ? window.openMobileAccountPanel() : window.openMobileTopPanel(name), panel);
                await page.setViewportSize({ width: 1200, height: 900 });
                await page.waitForFunction(() => !document.querySelector('.mobile-panel-open, .mobile-account-fullscreen'));
                assert.equal(await page.locator('.mobile-subbar-btn.active, .mobile-subbar-btn.selected').count(), 0);
                assert.equal(await page.locator('#analytics-dropdown').isVisible(), false);
                assert.equal(await page.locator('#profileDropdownMenu').isVisible(), false);
            }
            // Resizing a normal desktop dropdown must not dismiss it.
            await page.evaluate(() => document.getElementById('calendar-dropdown').classList.remove('hidden'));
            await page.setViewportSize({ width: 1100, height: 800 });
            assert.equal(await page.locator('#calendar-dropdown').isVisible(), true);
            // Recover stale mobile state even when no breakpoint is crossed.
            await page.evaluate(() => { window.openMobileTopPanel('analytics'); window.dispatchEvent(new Event('resize')); });
            assert.equal(await page.locator('#analytics-dropdown').isVisible(), false);
            await page.close();
        }
        console.log('Mobile panels dismiss on desktop for student and teacher; desktop menus remain usable.');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
