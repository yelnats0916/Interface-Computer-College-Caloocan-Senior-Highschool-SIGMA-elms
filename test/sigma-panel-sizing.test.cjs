const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        for (const role of ['admin', 'teacher', 'student']) {
            const page = await browser.newPage();
            await page.route('http://sigma.test/**', route => route.fulfill({ body: '<html></html>' }));
            await page.goto('http://sigma.test/');
            const source = fs.readFileSync(path.join(root, role + '.html'), 'utf8');
            const markup = await page.evaluate(source => new DOMParser().parseFromString(source, 'text/html').getElementById('sigmaAiPanel').outerHTML, source);
            await page.setContent(markup);
            for (const css of [role + '.css', 'forms.css', 'shared-components.css', 'topbar.css', 'mobile.css', 'sigma-conversations.css']) await page.addStyleTag({ path: path.join(root, 'css', css) });
            await page.addStyleTag({ content: '#sigmaAiPanel{top:82px;right:0;width:400px;max-width:100%;height:calc(100dvh - 82px);display:flex;flex-direction:column;overflow:hidden}#sigmaAiMessages{flex:1;min-height:0;overflow:auto}body{margin:0}#sigmaAiPanel.hidden{display:none!important}' });
            await page.evaluate(() => {
                document.body.classList.add('mobile-panel-open');
                document.getElementById('sigmaAiPanel').classList.remove('hidden');
                sessionStorage.setItem('sigma-authenticated-user', '{"uid":"sizing"}');
                document.getElementById('sigmaAiMessages').innerHTML = '<div class="sigma-ai-message" data-sigma-greeting="true"><div class="sigma-ai-message__meta">Today</div><div class="sigma-ai-message__row"><div class="sigma-ai-message__icon">!</div><div class="sigma-ai-message__bubble">Hello! What do you need today?</div></div></div>';
                window.renderSigmaEmptyState = () => '<p>No conversations yet</p>';
            });
            await page.addScriptTag({ path: path.join(root, 'js/sigma-conversations.js') });
            for (const [width, height] of [[1200, 800], [440, 956], [390, 650], [320, 480], [640, 360]]) {
                await page.setViewportSize({ width, height });
                await page.waitForTimeout(100);
                const bounds = await page.locator('#sigmaAiPanel').boundingBox();
                assert.ok(bounds.height >= height - 100, role + ': panel should retain its original full height');
                assert.ok(bounds.y + bounds.height <= height + 1, role + ': panel should stay inside viewport');
                assert.ok(await page.locator('#sigmaAiComposer').isVisible());
                assert.equal(await page.locator('.sigma-ai-message__bubble').evaluate(el => getComputedStyle(el).fontSize), '13.5px');
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
            }
            await page.getByRole('button', { name: 'Past conversations', exact: true }).click();
            assert.ok((await page.locator('#sigmaAiPanel').boundingBox()).height >= 260);
            await page.getByRole('button', { name: 'Past conversations', exact: true }).click();
            await page.evaluate(() => {
                const messages = document.getElementById('sigmaAiMessages');
                for (let i = 0; i < 30; i++) messages.append(messages.firstElementChild.cloneNode(true));
            });
            assert.equal(await page.locator('#sigmaAiMessages').evaluate(el => el.scrollHeight > el.clientHeight), true);
            const composer = await page.locator('#sigmaAiComposer').boundingBox();
            assert.ok(composer.y + composer.height <= 360);
            await page.screenshot({ path: path.join(process.env.TEMP, 'sigma-compact-' + role + '.png') });
            await page.close();
        }
        console.log('SIGMA full-height panels and original typography restored across desktop, mobile and landscape.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
