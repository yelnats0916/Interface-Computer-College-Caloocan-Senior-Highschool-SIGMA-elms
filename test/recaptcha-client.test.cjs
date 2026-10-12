const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/recaptcha-client.js'), 'utf8');
function element() {
    return { children: [], textContent: '', setAttribute() {}, append(...items) { this.children.push(...items); },
        appendChild(item) { this.children.push(item); }, replaceChildren() { this.children = []; } };
}
async function exercise(version, verified) {
    let verifiedCount = 0, invalidCount = 0, options;
    const config = { success: true, site_key: 'dummy-site-key', has_secret: true, version };
    const posts = [];
    const win = { location: { hostname: '127.0.0.1', port: '5519', protocol: 'http:', pathname: '/index.html' },
        grecaptcha: { ready: callback => callback(), render: (host, opts) => { options = opts; return 0; }, reset() {}, execute: async () => 'dummy-token' } };
    const document = { createElement: element, head: { appendChild: script => script.onload() } };
    const context = { window: win, document, AbortController, setTimeout, clearTimeout, fetch: async (url, request) => {
        if (request?.body) posts.push(JSON.parse(request.body));
        return { ok: true, json: async () => request?.body ? { success: verified, error: 'Rejected' } : config };
    } };
    vm.createContext(context);
    vm.runInContext(source, context);
    const required = win.SigmaRecaptcha.isChallengeRequired;
    assert.equal(required({ loginIdAttempts: 3, recaptchaEnabled: true }, 2, 0), false);
    assert.equal(required({ loginIdAttempts: 3, recaptchaEnabled: true }, 3, 0), true);
    assert.equal(required({ loginIdAttempts: 3, recaptchaEnabled: true }, 0, 3), true);
    assert.equal(required({ loginIdAttempts: 3, recaptchaEnabled: true }, 4, 0), true);
    assert.equal(required({ loginIdAttempts: 3, recaptchaEnabled: true }, 0, 4), true);
    assert.equal(required({ loginIdAttempts: 3, recaptchaEnabled: false }, 9, 9), false);
    assert.equal(win.SigmaRecaptcha.apiUrl(), 'http://127.0.0.1/sigma-elms/php/api/auth.php');
    const host = element();
    await win.SigmaRecaptcha.challenge(host, () => verifiedCount++, () => invalidCount++);
    if (version === 'v2') await options.callback('dummy-token');
    assert.equal(verifiedCount, verified ? 1 : 0);
    assert.equal(invalidCount, verified ? 0 : 1);
    assert.equal(posts[0].action, 'verify_recaptcha');
    assert.equal(posts[0].token, 'dummy-token');
    if (version === 'v2') { options['expired-callback'](); assert.equal(invalidCount, verified ? 1 : 2); }
}
(async () => {
    await exercise('v2', true); await exercise('v2', false);
    await exercise('v3', true); await exercise('v3', false);
    const index = fs.readFileSync(path.join(__dirname, '../js/index.js'), 'utf8');
    assert.equal(index.includes('const handleCaptchaChange'), false);
    assert.match(index, /cfg.recaptchaEnabled = data.enabled !== false/);
    assert.match(index, /SigmaRecaptcha.isChallengeRequired\(securityPolicy, invalidLoginIdAttempts, getPasswordAttempts\(accountKey\)\)/);
    console.log('Real token callbacks, v2/v3 failure handling, endpoint routing, and policy wiring passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
