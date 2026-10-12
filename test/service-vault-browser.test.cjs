const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
        await page.route('http://sigma.test/**', route => route.fulfill({ body: '<html></html>', contentType: 'text/html' }));
        await page.goto('http://sigma.test/admin.html');
        await page.setContent('<input type="password" id="ai-form-key-input"><input type="password" id="recaptcha-page-secret-key-input">');
        await page.addStyleTag({ path: path.join(root, 'css/service-vault-security.css') });
        await page.evaluate(() => {
            localStorage.setItem('sigma-api-keys', 'legacy-secret-copy');
            localStorage.setItem('sigma-api-vault-pass', 'legacy-password');
            sessionStorage.setItem('sigma-authenticated-user', JSON.stringify({ id: '0000000' }));
            window.calls = [];
            window.fetch = async (url, options = {}) => {
                const headers = new Headers(options.headers || {});
                let payload = {};
                try { payload = JSON.parse(options.body || '{}'); } catch {}
                window.calls.push({ url, action: payload.action, authorization: headers.get('Authorization') });
                if (payload.action === 'authorize_service_vault') return new Response(JSON.stringify({ success: true, token: 'a'.repeat(64), expires_in: 900 }), { status: 200 });
                if (headers.get('Authorization') === 'Bearer ' + 'a'.repeat(64)) return new Response(JSON.stringify({ success: true, keys: [] }), { status: 200 });
                return new Response(JSON.stringify({ code: 'VAULT_AUTH_REQUIRED' }), { status: 403 });
            };
        });
        await page.addScriptTag({ path: path.join(root, 'js/service-vault-security.js') });
        assert.equal(await page.evaluate(() => localStorage.getItem('sigma-api-keys')), null);
        assert.equal(await page.evaluate(() => localStorage.getItem('sigma-api-vault-pass')), null);
        assert.equal(await page.locator('#ai-form-key-input').getAttribute('maxlength'), '2048');
        assert.equal(await page.locator('#recaptcha-page-secret-key-input').getAttribute('maxlength'), '4096');
        assert.equal(await page.locator('#ai-form-key-input').getAttribute('autocomplete'), 'off');
        await page.locator('#ai-form-key-input').fill('gsk_invalid key with spaces');
        assert.equal(await page.locator('#ai-form-key-input').evaluate(input => input.checkValidity()), false);
        await page.locator('#ai-form-key-input').fill('gsk_test-only-secret-value');
        assert.equal(await page.locator('#ai-form-key-input').evaluate(input => input.checkValidity()), true);
        await page.evaluate(() => { window.resultPromise = window.fetch('http://sigma.test/php/api/auth.php?action=ai_vault').then(result => result.json()).then(value => { window.result = value; }); });
        await page.locator('dialog.service-vault-auth').waitFor();
        await page.locator('dialog input[name="password"]').fill('test-only-admin-password');
        assert.equal(await page.locator('dialog input[name="password"]').getAttribute('type'), 'password');
        await page.locator('dialog button[type="submit"]').click();
        await page.waitForFunction(() => window.result?.success);
        assert.equal(await page.locator('dialog').count(), 0);
        assert.equal(await page.evaluate(() => window.calls.filter(call => call.action === 'authorize_service_vault').length), 1);
        await page.evaluate(async () => { await window.fetch('http://sigma.test/php/api/upload.php', { method: 'POST', body: JSON.stringify({ action: 'test_connection' }) }); });
        assert.equal(await page.evaluate(() => window.calls.at(-1).authorization), 'Bearer ' + 'a'.repeat(64));
        const persistent = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
        assert(!persistent.includes('test-only-admin-password') && !persistent.includes('a'.repeat(64)) && !persistent.includes('gsk_test-only-secret-value'), 'Passwords, authorization tokens, and API secrets must not persist in browser storage');
        for (const width of [1200, 390]) {
            await page.setViewportSize({ width, height: 800 });
            await page.evaluate(() => {
                const dialog = document.createElement('dialog');
                dialog.className = 'service-vault-auth';
                dialog.innerHTML = '<form><h2>Administrator Verification</h2><label>Password<input type="password"></label><div class="service-vault-auth-actions"><button>Cancel</button><button type="submit">Verify</button></div></form>';
                document.body.append(dialog); dialog.showModal();
            });
            const box = await page.locator('dialog').boundingBox();
            assert(box.x >= 0 && box.x + box.width <= width);
            await page.evaluate(() => { const dialog = document.querySelector('dialog'); dialog.close(); dialog.remove(); });
        }
        console.log('PASS: secret input limits, no whitespace, no browser persistence, masked admin reauthentication, memory-only token, protected retry, desktop/mobile dialog');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
