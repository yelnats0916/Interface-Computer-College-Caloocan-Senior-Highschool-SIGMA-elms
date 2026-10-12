const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.setContent('<input id="outside"><div id="student-preview-modal"><textarea></textarea><div id="slot"></div></div>');
        const source = fs.readFileSync('js/shared-components.js', 'utf8');
        const start = source.indexOf('(function protectQuizClipboard()');
        await page.evaluate(source.slice(start, source.indexOf('(function syncMobileModalViewport()', start)));
        const results = await page.evaluate(() => {
            const field = document.querySelector('textarea');
            return ['copy', 'cut', 'paste'].map(type => ({
                blocked: !field.dispatchEvent(new Event(type, { bubbles: true, cancelable: true })),
                outsideAllowed: document.querySelector('#outside').dispatchEvent(new Event(type, { bubbles: true, cancelable: true }))
            })).concat({
                pasteBlocked: !field.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertFromPaste' })),
                typingAllowed: field.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: 'a' })),
                matchingAllowed: document.querySelector('#slot').dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }))
            });
        });
        results.slice(0, 3).forEach(result => { assert.ok(result.blocked); assert.ok(result.outsideAllowed); });
        assert.ok(results[3].pasteBlocked);
        assert.ok(results[3].typingAllowed);
        assert.ok(results[3].matchingAllowed);
        await page.locator('textarea').fill('typed answer');
        assert.equal(await page.locator('textarea').inputValue(), 'typed answer');
        console.log('PASS: quiz clipboard blocked; typing, matching drops and outside clipboard unaffected');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
