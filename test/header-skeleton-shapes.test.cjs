const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        const source = fs.readFileSync('student.html', 'utf8');
        const start = source.indexOf('<header');
        const header = source.slice(start, source.indexOf('</header>', start) + 9);
        const css = [...source.matchAll(/href="(css\/[^"?]+)(?:\?[^\"]*)?"/g)].map(match => fs.readFileSync(match[1], 'utf8')).join('\n');
        for (const width of [1280, 375]) {
            await page.setViewportSize({ width, height: 300 });
            await page.setContent(`<html class="sigma-initial-loading"><head><style>${css}</style></head><body>${header}</body></html>`);
            await page.evaluate(() => document.documentElement.classList.add('sigma-initial-loading'));
            await page.addStyleTag({ path: 'css/page-skeleton.css' });
            const shapes = await page.evaluate(() => {
                const style = selector => { const node = document.querySelector(selector); const s = getComputedStyle(node, '::after'); return [s.width, s.height, s.borderRadius]; };
                return { menu: style('#sidebarToggleBtn'), logo: style('#nav-logo-btn'), title: style('#nav-context-text'), parent: getComputedStyle(document.querySelector('#logo-container'), '::after').content };
            });
            assert.deepEqual(shapes.menu, ['28px', '28px', '6px']);
            assert.equal(shapes.logo[2], '50%');
            assert.equal(shapes.title[1], '16px');
            assert.equal(shapes.parent, 'none');
            for (const selector of ['#sidebarToggleBtn', '#nav-logo-btn', '#nav-context-text']) {
                const position = () => page.locator(selector).evaluate(element => getComputedStyle(element, '::after').backgroundPosition);
                const first = await position();
                await page.waitForTimeout(160);
                assert.notEqual(await position(), first, `${selector} shimmer must sweep at ${width}px`);
                const freeze = time => page.locator(selector).evaluate((element, time) => {
                    const sweep = element.getAnimations({ subtree: true }).find(animation => animation.animationName === 'sigma-header-sweep');
                    if (!sweep) throw new Error('Missing header sweep animation');
                    sweep.pause(); sweep.currentTime = time;
                }, time);
                await freeze(0);
                const before = await page.locator(selector).screenshot();
                await freeze(500);
                const highlighted = await page.locator(selector).screenshot();
                assert.notDeepEqual(highlighted, before, `${selector} sweep must change rendered pixels`);
            }
            await page.screenshot({ path: path.join(process.env.TEMP, `sigma-header-skeleton-${width}.png`) });
        }
        console.log('PASS: centered menu/logo/title skeletons with no nested logo placeholder.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
