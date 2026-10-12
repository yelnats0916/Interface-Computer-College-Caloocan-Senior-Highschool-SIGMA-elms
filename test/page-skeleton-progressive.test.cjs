const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    let release;
    const delayed = new Promise(resolve => { release = resolve; });
    try {
        const page = await browser.newPage();
        await page.route('http://sigma.test/**', async route => {
            const url = new URL(route.request().url());
            if (url.pathname === '/slow.js') {
                await delayed;
                return route.fulfill({ contentType: 'application/javascript', body: 'window.remainingScriptLoaded = true;' });
            }
            if (url.pathname === '/skeleton.js') return route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(path.join(__dirname, '../js/page-skeleton.js'), 'utf8') });
            if (url.pathname === '/skeleton.css') return route.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(__dirname, '../css/page-skeleton.css'), 'utf8') });
            return route.fulfill({ contentType: 'text/html', body: '<link rel="stylesheet" href="/skeleton.css"><script>document.addEventListener("DOMContentLoaded",()=>window.domReady=true)</script><body><script src="/skeleton.js"></script><header>School</header><main id="main-content"><h2>Assessment Summary</h2><button>Open</button></main><script src="/slow.js"></script></body>' });
        });
        await page.goto('http://sigma.test/', { waitUntil: 'commit' });
        await page.waitForFunction(() => document.querySelector('#main-content button'));
        assert.equal(await page.evaluate(() => document.documentElement.classList.contains('sigma-initial-loading')), true);
        assert.equal(await page.locator('h2').evaluate(node => getComputedStyle(node, '::after').animationName), 'sigma-sweep-band');
        assert.equal(await page.evaluate(() => Boolean(window.domReady)), false);
        release();
        await page.waitForFunction(() => window.domReady && window.remainingScriptLoaded);
        await page.waitForFunction(() => !document.documentElement.classList.contains('sigma-initial-loading'));
        assert.equal(await page.evaluate(() => document.documentElement.classList.contains('sigma-initial-loading')), false);
        console.log('Startup sweep stays active during setup and clears when the DOM is ready.');
    } finally { release(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
