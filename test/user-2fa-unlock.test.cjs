const fs = require('fs');
const assert = require('assert');

// 1. Check php/api/users.php returns totp flags
const usersPhp = fs.readFileSync('php/api/users.php', 'utf8');
assert(usersPhp.includes("'totp_enabled' => !empty($row['totp_enabled'])"), 'users.php must serialize totp_enabled');
assert(usersPhp.includes("'has2fa'       => !empty($row['totp_enabled']) || !empty($row['totp_secret'])"), 'users.php must serialize has2fa');
assert(usersPhp.includes("'totpSecretGenerated' => !empty($row['totp_secret'])"), 'users.php must serialize totpSecretGenerated');

// 2. Check admin.js defines window.userHasAccessed2FA
const adminJs = fs.readFileSync('js/admin.js', 'utf8');
assert(adminJs.includes('window.userHasAccessed2FA = function'), 'admin.js must define window.userHasAccessed2FA');
assert(adminJs.includes('const userHas2FA = window.userHasAccessed2FA ? window.userHasAccessed2FA(user, id) : false;'), 'renderUserAccountsTable must check userHas2FA');
assert(adminJs.includes('Locked: User has not accessed or set up 2FA QR code yet'), 'admin.js must show locked message when user has not accessed QR');
assert(adminJs.includes('2FA Not Yet Activated'), 'admin.js resetUser2FA must guard against resetting users without 2FA');

// 3. Test window.userHasAccessed2FA logic
const sandbox = {
    window: {},
    localStorage: {
        _store: {},
        getItem(k) { return this._store[k] || null; },
        setItem(k, v) { this._store[k] = String(v); }
    },
    USER_STORAGE_KEY: 'test-users',
    getStoredJson() { return []; }
};
global.localStorage = sandbox.localStorage;

const fnStart = adminJs.indexOf('window.userHasAccessed2FA = function');
const fnEnd = adminJs.indexOf('window.resetUser2FA = function', fnStart);
const fnCode = adminJs.slice(fnStart, fnEnd);
eval(fnCode.replace('window.userHasAccessed2FA', 'sandbox.userHasAccessed2FA'));

const userFresh = { id: '2026-01-T00001', role: 'Teacher', totp_enabled: false, has2fa: false };
assert.strictEqual(sandbox.userHasAccessed2FA(userFresh, userFresh.id), false, 'Fresh user must not have accessed 2FA');

const userWithSecret = { id: '2026-01-T00002', role: 'Teacher', totpSecretGenerated: true };
assert.strictEqual(sandbox.userHasAccessed2FA(userWithSecret, userWithSecret.id), true, 'User who received QR secret must have accessed 2FA');

const userEnabled = { id: '2026-01-T00003', role: 'Teacher', totp_enabled: true };
assert.strictEqual(sandbox.userHasAccessed2FA(userEnabled, userEnabled.id), true, 'User with totp_enabled must have accessed 2FA');

const userLocal = { id: '2026-01-T00004', role: 'Teacher' };
sandbox.localStorage.setItem('sigma-2fa-secret-2026-01-T00004', 'JBSWY3DPEHPK3PXP');
assert.strictEqual(sandbox.userHasAccessed2FA(userLocal, userLocal.id), true, 'User with local secret must have accessed 2FA');

console.log('ALL 2FA UNLOCK CHECKS PASSED!');
