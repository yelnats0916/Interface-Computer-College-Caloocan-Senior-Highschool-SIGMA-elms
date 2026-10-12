const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
        const source = fs.readFileSync(path.join(__dirname, '../admin.html'), 'utf8');
        const start = source.indexOf('                <!-- Card 1: Institution Logo -->');
        const panel = source.slice(start, source.indexOf('                <!-- Card 2: Login Slideshow -->', start));
        await page.route('http://sigma.test/**', route => {
            const url = new URL(route.request().url());
            if (url.pathname === '/js/institution-branding.js') return route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(path.join(__dirname, '../js/institution-branding.js')) });
            if (url.pathname.startsWith('/image/')) return route.fulfill({ contentType: 'image/jpeg', body: fs.readFileSync(path.join(__dirname, '../image/ICC logo.jpg')) });
            return route.fulfill({ contentType: 'text/html', body: '<link rel="icon" href="/image/ICC%20logo.jpg"><header><img alt="ICC Logo" src="/image/ICC%20logo.jpg" width="40" height="40"></header>' + panel });
        });
        await page.goto('http://sigma.test/admin.html');
        await page.addStyleTag({ path: path.join(__dirname, '../css/forms.css') });
        await page.addStyleTag({ path: path.join(__dirname, '../css/settings-view.css') });
        await page.addScriptTag({ url: 'http://sigma.test/js/institution-branding.js' });
        for (const selector of ['#institution-logo-upload', '#institution-logo-restore', '#institution-logo-save', '.institution-logo-previews']) {
            assert.equal(await page.locator(selector).isVisible(), false);
        }
        await page.locator('#institution-logo-change').click();
        assert.equal(await page.getByRole('button', { name: 'Restore default logo' }).textContent(), '');
        assert.equal(await page.locator('#institution-logo-restore').getAttribute('title'), 'Restore default logo');
        assert.equal(await page.locator('#institution-logo-change').isVisible(), false);
        assert.equal(await page.locator('#institution-logo-upload').isVisible(), true);
        assert.equal(await page.locator('#institution-logo-restore').isVisible(), true);
        assert.equal(await page.locator('#institution-logo-save').isVisible(), true);
        assert.equal(await page.locator('#institution-logo-cancel').isVisible(), true);
        assert.deepEqual(await page.locator('.institution-logo-size').allTextContents(), [
            'Preview: 96 x 96 px', 'Preview: 40 x 40 px', 'Preview: 16 x 16 px'
        ]);
        assert.equal(await page.locator('.institution-logo-previews figcaption').first().evaluate(node => getComputedStyle(node).color), 'rgb(0, 0, 0)');
        assert.equal(await page.locator('.institution-logo-size').first().evaluate(node => getComputedStyle(node).color), 'rgba(0, 0, 0, 0.45)');
        for (const [sample, size] of [['login', 96], ['header', 40], ['tab', 16]]) {
            const bounds = await page.locator(`.institution-logo-sample-${sample} img`).boundingBox();
            assert.equal(bounds.width, size);
            assert.equal(bounds.height, size);
        }
        const original = await page.locator('header img').getAttribute('src');
        assert.equal(new URL(original).pathname, '/image/ICC%20logo.jpg', 'Default is the original ICC crest');
        await page.evaluate(src => {
            const logo = document.createElement('img');
            logo.alt = 'ICC Logo';
            logo.id = 'secondary-institution-logo';
            logo.width = logo.height = 40;
            logo.src = src;
            document.body.appendChild(logo);
        }, original);
        assert.equal(await page.locator('#institution-logo-save').isDisabled(), true);
        assert.equal(await page.locator('#institution-logo-restore').isDisabled(), true);
        const logoBounds = await page.locator('#institution-logo-preview').boundingBox();
        const changeBounds = await page.locator('#institution-logo-upload').boundingBox();
        const subtitleBounds = await page.locator('.institution-logo-description').boundingBox();
        assert.ok(changeBounds.y >= logoBounds.y + logoBounds.height, 'Change button sits below logo');
        assert.ok(subtitleBounds.x > logoBounds.x + logoBounds.width, 'Subtitle sits to the right');
        const editorBounds = await page.locator('.institution-logo-editor').boundingBox();
        assert.ok(subtitleBounds.x - logoBounds.x - logoBounds.width > 100, 'Subtitle keeps the wider spacing');
        assert.ok(Math.abs(logoBounds.x + logoBounds.width / 2 - editorBounds.x - editorBounds.width / 2) < 1, 'Logo is centered in the left column');
        assert.ok(Math.abs(subtitleBounds.y + subtitleBounds.height / 2 - editorBounds.y - editorBounds.height / 2) < 1);
        assert.equal(await page.locator('.institution-logo-description').evaluate(node => getComputedStyle(node).color), 'rgba(0, 0, 0, 0.45)');
        const png = await page.evaluate(() => {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 100;
            canvas.getContext('2d').fillRect(10, 10, 80, 80);
            return canvas.toDataURL('image/png').split(',')[1];
        });
        const upload = { name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') };
        await page.locator('#institution-logo-input').setInputFiles(upload);
        await page.waitForFunction(() => !document.getElementById('institution-logo-save').disabled);
        assert.equal(await page.locator('#institution-logo-restore').isVisible(), true);
        assert.equal(await page.locator('header img').getAttribute('src'), original, 'Draft must not update live logo');
        await page.locator('#institution-logo-cancel').click();
        assert.equal(await page.locator('#institution-logo-restore').isVisible(), false);
        assert.equal(await page.locator('#institution-logo-preview').getAttribute('src'), original);
        assert.equal(await page.locator('.institution-logo-previews').isVisible(), false);
        await page.locator('#institution-logo-change').click();
        await page.locator('#institution-logo-input').setInputFiles(upload);
        await page.waitForFunction(() => !document.getElementById('institution-logo-save').disabled);
        await page.locator('#institution-logo-save').click();
        const saved = await page.evaluate(() => localStorage.getItem('sigma-institution-logo'));
        assert.ok(saved.startsWith('data:image/png'), 'Transparency-capable PNG is preserved');
        assert.equal(await page.locator('header img').getAttribute('src'), saved);
        assert.equal(await page.locator('#secondary-institution-logo').getAttribute('src'), saved);
        assert.equal(await page.locator('link[rel="icon"]').getAttribute('href'), saved);
        for (const key of ['sigma-custom-login-logo', 'sigma-custom-login-bar-logo', 'sigma-custom-nav-logo']) {
            assert.equal(await page.evaluate(key => localStorage.getItem(key), key), saved);
        }
        assert.equal(await page.locator('#institution-logo-save').isVisible(), false);
        assert.equal(await page.locator('#institution-logo-change').isVisible(), true);
        await page.locator('#institution-logo-change').click();
        await page.locator('#institution-logo-restore').click();
        assert.equal(await page.locator('#institution-logo-preview').getAttribute('src'), original);
        for (const src of await page.locator('[data-institution-logo-preview]').evaluateAll(images => images.map(image => image.src))) {
            assert.equal(src, original);
        }
        assert.equal(await page.locator('header img').getAttribute('src'), saved);
        await page.locator('#institution-logo-save').click();
        assert.equal(await page.locator('header img').getAttribute('src'), original);
        assert.equal(await page.locator('link[rel="icon"]').getAttribute('href'), original);
        assert.equal(await page.locator('#secondary-institution-logo').getAttribute('src'), original);
        await page.reload();
        await page.addStyleTag({ path: path.join(__dirname, '../css/forms.css') });
        await page.addStyleTag({ path: path.join(__dirname, '../css/settings-view.css') });
        await page.addScriptTag({ url: 'http://sigma.test/js/institution-branding.js' });
        assert.equal(await page.locator('header img').getAttribute('src'), original, 'Default persists after refresh');
        assert.equal(await page.locator('link[rel="icon"]').getAttribute('href'), original);
        await page.locator('#institution-logo-change').click();
        await page.locator('#institution-logo-input').setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid') });
        assert.equal(await page.locator('#institution-logo-save').isDisabled(), true);
        assert.match(await page.locator('#institution-logo-feedback').textContent(), /PNG, JPEG or WebP/);
        for (const width of [1200, 600, 390, 320]) {
            await page.setViewportSize({ width, height: 900 });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        }
        console.log('Branding tests passed: preview, cancel, shared save, favicon, restore, validation and responsive layout.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
