const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        const page = await browser.newPage();
        await page.route('http://sigma.test/**', route => route.fulfill({ contentType: 'text/html', body: '<section id="settings-ai-view" class="dynamic-section"></section>' }));
        await page.goto('http://sigma.test/admin.html#settings-ai-view');
        await page.evaluate(() => {
            window.tab = 'functions';
            window.editor = false;
            window.selectAiSettingsTab = tab => { window.tab = tab; };
            window.toggleAddAiKeyForm = show => { window.editor = show; };
            window.setRecaptchaKeyEditing = (key, editing) => { window[key] = editing; };
            window.setGoogleDriveFolderEditing = editing => { window.drive = editing; };
        });
        await page.addScriptTag({ path: path.join(__dirname, '../js/system-settings-history.js') });
        await page.evaluate(() => {
            window.tab = 'keys';
            window.recordSystemSettingsLayer({ kind: 'ai-tab', tab: 'keys' });
            window.editor = true;
            window.recordSystemSettingsLayer({ kind: 'ai-editor', tab: 'keys', id: '' });
        });
        await page.goBack();
        assert.equal(await page.evaluate(() => window.editor), false);
        assert.equal(await page.evaluate(() => window.tab), 'keys');
        await page.goBack();
        assert.equal(await page.evaluate(() => window.tab), 'functions');
        await page.goForward();
        await page.goForward();
        assert.equal(await page.evaluate(() => window.editor), true);
        await page.evaluate(() => window.closeSystemSettingsLayer('ai-editor'));
        await page.waitForFunction(() => !window.editor);
        assert.equal(await page.evaluate(() => window.tab), 'keys');
        await page.evaluate(() => {
            history.replaceState({}, '', '#settings-recaptcha-view');
            document.querySelector('section').id = 'settings-recaptcha-view';
            window.recordSystemSettingsLayer({ kind: 'recaptcha-editor', key: 'secret' });
            window.secret = true;
        });
        await page.goBack();
        assert.equal(await page.evaluate(() => window.secret), false);
        await page.goForward();
        assert.equal(await page.evaluate(() => window.secret), true);
        await page.evaluate(() => {
            history.replaceState({}, '', '#settings-gdrive-view');
            document.querySelector('section').id = 'settings-gdrive-view';
            window.drive = true;
            window.recordSystemSettingsLayer({ kind: 'drive-editor' });
        });
        await page.goBack();
        assert.equal(await page.evaluate(() => window.drive), false);
        await page.goForward();
        assert.equal(await page.evaluate(() => window.drive), true);
        console.log('Settings history tests passed: Back/Forward, AI tabs/editor, reCAPTCHA and Drive editors.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
