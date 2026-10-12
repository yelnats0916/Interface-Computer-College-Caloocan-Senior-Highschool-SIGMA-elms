const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/index.js'), 'utf8');
const start = source.indexOf('    async function open2faSetupModal(');
const end = source.indexOf("    document.getElementById('landing2faSetupForm')", start);
const sandbox = {
    current2faUserId: null, current2faSuccessCallback: null, current2faSetupFromServer: false,
    document: { activeElement: null, getElementById: () => null },
    ensureLandingAtTop() {}, resolveAuthApiUrl: () => '/auth.php',
    fetch: async () => ({ json: async () => ({ success: true, secret: 'synthetic-test', otpauth_url: 'test' }) })
};
vm.createContext(sandbox);
vm.runInContext(source.slice(start, end), sandbox);
(async () => {
    let first = 0, second = 0;
    await sandbox.open2faSetupModal('account-1', () => first++);
    sandbox.current2faSuccessCallback();
    await sandbox.open2faSetupModal('account-2', () => second++);
    sandbox.current2faSuccessCallback();
    assert.equal(first, 1);
    assert.equal(second, 1);
    assert.equal(sandbox.current2faUserId, 'account-2');
    assert.equal(sandbox.current2faSetupFromServer, true);
    console.log('PASS: first-time setup preserves and replaces the correct account login callback');
})().catch(error => { console.error(error); process.exitCode = 1; });
