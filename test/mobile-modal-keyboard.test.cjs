const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
        await page.setContent(`<style>
            body { margin:0 }
            .sigma-modal-overlay { position:fixed; top:var(--sigma-visible-viewport-top,0px);
                height:var(--sigma-visible-viewport-height,800px); width:100%; overflow:auto }
            header { position:sticky; top:0; height:60px; background:white }
            footer { position:sticky; bottom:0; height:48px; background:white }
            textarea { height:80px; display:block }
        </style><div class="sigma-modal-overlay"><header class="sigma-quiz-sticky-header"></header>
        <div style="height:450px"></div><textarea></textarea><div style="height:400px"></div>
        <footer class="sigma-modal-footer"></footer></div>`);
        const source = fs.readFileSync('js/shared-components.js', 'utf8');
        const start = source.indexOf('(function syncMobileModalViewport()');
        const end = source.indexOf('(function syncMaterialMobileDockClearance()', start);
        await page.evaluate(() => {
            const viewport = new EventTarget();
            Object.assign(viewport, { height: 800, offsetTop: 0 });
            Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true });
        });
        await page.evaluate(source.slice(start, end));
        await page.locator('textarea').focus();
        await page.evaluate(() => {
            window.visualViewport.height = 360;
            window.visualViewport.dispatchEvent(new Event('resize'));
        });
        await page.waitForTimeout(100);
        const result = await page.evaluate(() => {
            const field = document.querySelector('textarea').getBoundingClientRect();
            const footer = document.querySelector('footer').getBoundingClientRect();
            const header = document.querySelector('header').getBoundingClientRect();
            return { top: field.top, bottom: field.bottom, header: header.bottom, footer: footer.top,
                height: document.querySelector('.sigma-modal-overlay').clientHeight };
        });
        assert.equal(result.height, 360);
        assert.ok(result.top >= result.header + 11, JSON.stringify(result));
        assert.ok(result.bottom <= result.footer - 11, JSON.stringify(result));
        console.log('PASS: simulated keyboard resize keeps focused field clear of sticky header and footer');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
