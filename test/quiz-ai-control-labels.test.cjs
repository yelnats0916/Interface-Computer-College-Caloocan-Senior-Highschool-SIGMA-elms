const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        const page = await browser.newPage();
        const html = fs.readFileSync(path.join(root, 'quiz-creator.html'), 'utf8');
        const row = await page.evaluate(source => new DOMParser().parseFromString(source, 'text/html').getElementById('ai-gen-engine-type-row').outerHTML, html);
        await page.setContent('<style>body{margin:0;padding:16px;box-sizing:border-box}*{box-sizing:border-box}[hidden]{display:none}</style>' + row);
        await page.addStyleTag({ path: path.join(root, 'css/tailwind.css') });
        await page.addStyleTag({ path: path.join(root, 'css/forms.css') });
        const styles = await page.evaluate(source => Array.from(new DOMParser().parseFromString(source, 'text/html').querySelectorAll('style')).map(style => style.textContent).find(css => css.includes('#ai-gen-count-control')), html);
        await page.addStyleTag({ content: styles });
        for (const width of [1200, 390, 320]) {
            await page.setViewportSize({ width, height: 800 });
            const typeLabel = page.locator('#ai-gen-type-heading');
            const countLabel = page.locator('label[for="ai-gen-count"]');
            assert.equal(await typeLabel.evaluate(el => getComputedStyle(el).color), 'rgb(0, 0, 0)');
            assert.equal(await countLabel.evaluate(el => getComputedStyle(el).color), 'rgb(0, 0, 0)');
            const type = await page.locator('#ai-gen-type-btn').boundingBox();
            assert.equal(type.width, width < 640 ? 240 : 280, 'Dropdown uses a compact width instead of stretching');
            const menuWidth = await page.locator('#ai-gen-type-menu').evaluate(menu => {
                menu.classList.remove('hidden');
                const width = menu.getBoundingClientRect().width;
                menu.classList.add('hidden');
                return width;
            });
            assert.equal(menuWidth, type.width, 'Menu matches the compact dropdown width');
            const typeHeading = await typeLabel.boundingBox();
            const count = await page.locator('#ai-gen-count-control').boundingBox();
            const countHeading = await countLabel.boundingBox();
            assert(typeHeading.y + typeHeading.height <= type.y);
            assert(countHeading.y + countHeading.height <= count.y);
            if (width > 640) assert(Math.abs(count.y - type.y) < 1);
            assert(!(await page.locator('#ai-gen-type-btn').textContent()).includes('Type:'));
            assert.equal(await page.locator('#ai-gen-count-max-label').evaluate(el => getComputedStyle(el).color), 'rgb(0, 0, 0)');
            const maxLabel = await page.locator('#ai-gen-count-max-label').boundingBox();
            assert(count.x + count.width < maxLabel.x, 'Maximum label is outside the counter box');
            assert.equal(count.width, 88);
            assert.equal(await page.locator('#ai-gen-count').evaluate(el => getComputedStyle(el).textAlign), 'center');
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
            await page.screenshot({ path: path.join(process.env.TEMP, `quiz-ai-labels-${width}.png`) });
        }
        console.log('PASS: black labels outside type/count controls, aligned desktop controls, mobile widths, black count maximum');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
