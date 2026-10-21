const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('js/index.js', 'utf8');
const start = source.indexOf('    // Reset only after the server confirms');
const end = source.indexOf('    // ── 2FA INPUT RESTRICTIONS', start);
assert.ok(start > 0 && end > start);
async function run(fail) {
    let handler, back = 0, removed = [], requests = [];
    const err = { textContent: '', classList: { add() {}, remove() {} }, setAttribute() {} };
    const btn = { disabled: false, textContent: '', addEventListener(_, fn) { handler = fn; } };
    const context = {
        current2faUserId: 'verified-account',
        document: { getElementById: id => id === 'landing2faResetSelfBtn' ? btn : err },
        window: { SigmaDatabase: { async request(name, data) { requests.push([name, data]); if (fail) throw new Error('Verified administrator recovery required.'); } }, backToLoginForm() { back++; } },
        sessionStorage: { removeItem(key) { removed.push(key); } },
        localStorage: { removeItem() { throw new Error('Must not change local account flags.'); } },
        ui: { errors: { pass: {} }, inputs: { pass: {} } }, showError() {}
    };
    vm.runInNewContext(source.slice(start, end), context);
    await handler();
    assert.equal(btn.disabled, false);
    assert.equal(requests[0][1].data.action, 'disable_2fa');
    assert.equal(back, fail ? 0 : 1);
    assert.equal(removed.length, fail ? 0 : 2);
    if (fail) assert.match(err.textContent, /administrator recovery/);
}
(async () => { await run(true); await run(false); console.log('Reset UI failure/success checks passed. No network or database writes.'); })().catch(e => { console.error(e); process.exitCode = 1; });
