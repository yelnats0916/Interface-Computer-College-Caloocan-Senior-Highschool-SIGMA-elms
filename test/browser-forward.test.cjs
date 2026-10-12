const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const source = fs.readFileSync(path.join(__dirname, '../js/shared-components.js'), 'utf8');
const start = source.indexOf('(function initUniversalFormBackHandler(window)');
const controller = source.slice(start, source.indexOf('})(window);', start) + '})(window);'.length);
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        for (const portal of ['admin', 'student', 'teacher']) {
            const page = await browser.newPage();
            await page.route('http://sigma.test/**', route => route.fulfill({ contentType: 'text/html', body: '<style>.hidden{display:none}</style><h1 id="screen">Home</h1><button id="open">Open dialog</button><div id="fixture-modal" class="hidden" data-modal-overlay><button id="close">Close</button></div>' }));
            await page.goto('http://sigma.test/' + portal + '.html#home');
            await page.addScriptTag({ content: controller });
            await page.evaluate(() => {
                document.getElementById('open').onclick = () => document.getElementById('fixture-modal').classList.remove('hidden');
                document.getElementById('close').onclick = () => document.getElementById('fixture-modal').classList.add('hidden');
                window.addEventListener('popstate', event => {
                    document.getElementById('screen').textContent = event.state?.page || 'Home';
                });
                history.pushState({ page: 'Logs' }, '', '#logs');
                document.getElementById('screen').textContent = 'Logs';
            });
            await page.locator('#open').click();
            await page.waitForFunction(() => history.state?._modalName === 'fixture-modal');
            await page.goBack();
            await page.waitForFunction(() => document.getElementById('fixture-modal').classList.contains('hidden'));
            await page.goForward();
            await page.waitForFunction(() => !document.getElementById('fixture-modal').classList.contains('hidden'));
            assert.equal(await page.locator('#screen').textContent(), 'Logs');
            await page.goBack();
            await page.waitForFunction(() => document.getElementById('fixture-modal').classList.contains('hidden'));
            await page.goBack();
            await page.waitForFunction(() => document.getElementById('screen').textContent === 'Home');
            await page.goForward();
            await page.waitForFunction(() => document.getElementById('screen').textContent === 'Logs');
            await page.goForward();
            await page.waitForFunction(() => !document.getElementById('fixture-modal').classList.contains('hidden'));
            await page.close();
        }
        console.log('Shared Forward restores dialogs and routes without running Back actions in all three portals.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
