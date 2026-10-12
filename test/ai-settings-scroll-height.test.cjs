const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        const page = await browser.newPage();
        for (const file of ['admin.html', 'php/includes/system_settings_views.php']) {
            const source = fs.readFileSync(path.join(root, file), 'utf8');
            const start = source.indexOf('<section id="settings-ai-view"');
            const section = source.slice(start, source.indexOf('</section>', start) + 10);
            for (const viewport of [{ width: 1920, height: 900 }, { width: 1440, height: 800 }, { width: 390, height: 844 }]) {
                await page.setViewportSize(viewport);
                const offset = viewport.width < 768 ? 105 : 82;
                await page.setContent(`<style>body{margin:0;display:flex;flex-direction:column;min-height:100vh;--shell-offset:${offset}px}header{flex:0 0 ${offset}px}main{flex:1}</style><header></header><main>${section}</main>`);
                for (const css of ['tailwind.css', 'forms.css', 'settings-view.css']) await page.addStyleTag({ path: path.join(root, 'css', css) });
                await page.evaluate(() => {
                    const section = document.getElementById('settings-ai-view');
                    section.classList.remove('hidden');
                    const card = document.getElementById('ai-add-key-card');
                    card.classList.remove('hidden');
                    Array.from(card.parentElement.children).forEach(child => { if (child !== card) child.style.display = 'none'; });
                    const field = document.getElementById('ai-form-model-field');
                    field.hidden = false;
                });
                const sizes = await page.evaluate(() => ({ height: innerHeight, scroll: document.documentElement.scrollHeight, wrapper: document.getElementById('settings-ai-view').getBoundingClientRect().height }));
                assert(sizes.scroll <= sizes.height + 1, `${file}: short form should not create blank vertical scrolling at ${viewport.width}: ${JSON.stringify(sizes)}`);
                assert.equal(sizes.wrapper, viewport.height - offset);
                await page.evaluate(() => {
                    const content = document.createElement('div');
                    content.style.height = '1200px';
                    document.getElementById('ai-add-key-card').append(content);
                });
                assert(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight), 'Long content must still scroll normally');
            }
        }
        console.log('PASS: short AI key forms fit beneath desktop/mobile headers in HTML/PHP; long content remains scrollable');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
