const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
        const html = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
        const start = html.indexOf('<section id="settings-branding-view"');
        const end = html.indexOf('<section id="settings-integrations-view"', start);
        const body = html.slice(start, end);
        await page.route('http://sigma.test/**', route => {
            const url = new URL(route.request().url());
            if (url.pathname.startsWith('/js/')) return route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(path.join(root, url.pathname.slice(1))) });
            if (url.pathname.startsWith('/image/')) return route.fulfill({ contentType: 'image/jpeg', body: fs.readFileSync(path.join(root, 'image/ICC logo.jpg')) });
            return route.fulfill({ contentType: 'text/html', body });
        });
        await page.goto('http://sigma.test/admin.html');
        await page.addStyleTag({ path: path.join(root, 'css/forms.css') });
        await page.addStyleTag({ path: path.join(root, 'css/settings-view.css') });
        await page.addStyleTag({ content: '#settings-branding-view{display:block}.sigma-settings-layout{height:800px;min-height:800px;max-height:800px}' });
        await page.addScriptTag({ url: 'http://sigma.test/js/institution-branding.js' });
        await page.addScriptTag({ url: 'http://sigma.test/js/slideshow-settings.js' });
        const sidebar = page.locator('#settings-branding-view .sigma-settings-sidebar');
        for (const [button, active, cancel] of [['#institution-logo-change', '#brand-logos-panel', '#institution-logo-cancel'], ['#slideshow-manage', '#brand-slides-panel', '#slideshow-cancel']]) {
            await page.locator(button).click();
            assert.equal(await sidebar.isVisible(), false);
            assert.equal(await page.locator(active).isVisible(), true);
            assert.equal(await page.locator('#settings-branding-view .sigma-settings-panel-card:visible').count(), 1);
            assert.equal(await page.locator('.sigma-settings-main').evaluate(node => node.scrollTop), 0);
            await page.locator(cancel).click();
            assert.equal(await sidebar.isVisible(), true);
            assert.equal(await page.locator('#settings-branding-view .sigma-settings-panel-card:visible').count(), 3);
        }
        await page.locator('#slideshow-manage').click();
        await page.getByRole('combobox', { name: 'Position of slide 2', exact: true }).selectOption('0');
        await page.locator('#slides-save-btn').click();
        assert.equal(await sidebar.isVisible(), true);
        assert.equal(await page.locator('#brand-logos-panel').isVisible(), true);
        for (const action of ['cancel', 'save']) {
            const before = await page.evaluate(() => {
                const main = document.querySelector('#settings-branding-view .sigma-settings-main');
                const panel = document.getElementById('brand-slides-panel');
                main.scrollTop = panel.offsetTop - main.offsetTop - 40;
                return { scroll: main.scrollTop, top: panel.getBoundingClientRect().top };
            });
            await page.locator('#slideshow-manage').evaluate(button => button.click());
            if (action === 'save') await page.getByRole('combobox', { name: 'Position of slide 2', exact: true }).selectOption('0');
            await page.locator(action === 'save' ? '#slides-save-btn' : '#slideshow-cancel').click();
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            const after = await page.evaluate(() => ({
                scroll: document.querySelector('#settings-branding-view .sigma-settings-main').scrollTop,
                top: document.getElementById('brand-slides-panel').getBoundingClientRect().top
            }));
            assert.deepEqual(after, before, `${action} returns to the same slideshow screen position`);
        }
        console.log('Branding isolation passed: only active editor visible, sidebar hidden, scroll reset, Save/Cancel restore overview.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
