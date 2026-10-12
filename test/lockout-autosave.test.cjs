const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/admin.js'), 'utf8');
const input = { value: '8' }, status = { textContent: '' };
let saved = { passwordAttempts: 8, recaptchaEnabled: true, loginIdAttempts: 3 }, writes = 0, fail = false;
const context = {
    window: {}, setTimeout, clearTimeout,
    document: { getElementById: id => id === 'password-lockout-attempts' ? input : status },
    getStoredJson: () => saved,
    localStorage: { setItem(key, value) { if (fail) throw new Error('Storage full'); saved = JSON.parse(value); writes++; } }
};
vm.createContext(context);
const start = source.indexOf('let securitySettingsSaveTimer;');
vm.runInContext(source.slice(start, source.indexOf('window.loadLoginSecuritySettings =', start)), context);
(async () => {
    input.value = '9'; context.window.scheduleSecuritySettingsSave();
    input.value = '10'; context.window.scheduleSecuritySettingsSave();
    await new Promise(resolve => setTimeout(resolve, 550));
    assert.equal(writes, 1); assert.equal(saved.passwordAttempts, 10);
    assert.equal(saved.recaptchaEnabled, true); assert.equal(saved.loginIdAttempts, 3);
    assert.equal(status.textContent, 'Saved');
    for (const value of ['', '0', '51', '2.5']) {
        input.value = value; context.window.scheduleSecuritySettingsSave();
        await new Promise(resolve => setTimeout(resolve, 550));
        assert.equal(writes, 1);
    }
    fail = true; input.value = '11'; context.window.scheduleSecuritySettingsSave();
    await new Promise(resolve => setTimeout(resolve, 550));
    assert.equal(Number(input.value), 10); assert.match(status.textContent, /reverted/);
    for (const file of ['admin.html', 'php/includes/system_settings_views.php']) {
        const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
        assert.equal(html.includes('id="security-save-btn"'), false);
        assert.ok(html.includes('oninput="window.scheduleSecuritySettingsSave()"'));
    }
    console.log('Lockout autosave passed: debounce, validation, preserve other settings, rollback and Save removed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
