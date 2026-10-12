const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const admin = read('js/admin.js');
const saveStart = admin.indexOf('window.saveSecuritySettings =');
const save = admin.slice(saveStart, admin.indexOf('window.loadLoginSecuritySettings =', saveStart));
const input = { value: '8' };
const button = { disabled: false };
let stored = { loginIdAttempts: 3, recaptchaEnabled: false, passwordAttempts: 4 };
let maintenanceChanges = 0;
let failStorage = false;
const messages = [];
const context = {
    window: {
        SigmaSettingsCounters: { normalizeAll() {} },
        showToast: (...args) => messages.push(args),
        setMaintenanceConfig: () => maintenanceChanges++,
        canCurrentAdminManageMaintenance: () => true
    },
    document: { getElementById: id => id === 'security-save-btn' ? button : id === 'password-lockout-attempts' ? input : null },
    getStoredJson: () => stored,
    localStorage: { setItem(key, value) {
        assert.equal(key, 'sigma-login-security-config');
        if (failStorage) throw new Error('Storage unavailable');
        stored = JSON.parse(value);
    } }
};
vm.createContext(context);
vm.runInContext(save, context);
context.window.saveSecuritySettings();
assert.deepEqual(stored, { loginIdAttempts: 3, recaptchaEnabled: false, passwordAttempts: 8 });
assert.equal(maintenanceChanges, 0);
assert.equal(button.disabled, false);
input.value = '51';
context.window.saveSecuritySettings();
assert.equal(stored.passwordAttempts, 8);
assert.equal(messages.at(-1)[1], 'error');
input.value = '5';
failStorage = true;
context.window.saveSecuritySettings();
assert.equal(messages.at(-1)[1], 'error');
assert.equal(button.disabled, false);
assert.equal(stored.passwordAttempts, 8);
const html = read('index.html');
assert.ok(html.indexOf('src="js/recaptcha-client.js') < html.indexOf('src="js/index.js'));
assert.ok(html.includes('src="js/recaptcha-client.js'));
const login = read('js/index.js');
const comparison = login.match(/if \((nextPasswordAttempts [><=]+ securityConfig.passwordAttempts)\)/)[1];
for (const [count, expected] of [[7, false], [8, true], [9, true]]) {
    assert.equal(vm.runInNewContext(comparison, { nextPasswordAttempts: count, securityConfig: { passwordAttempts: 8 } }), expected);
}
console.log('Lockout persistence, isolated Save, failure handling, exact limit, and login client loading passed');
