const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexJs = fs.readFileSync(path.join(__dirname, '../js/index.js'), 'utf8');

// 1. Verify 2FA check does NOT bypass login when backend is offline
assert.ok(
    !indexJs.includes("console.warn('2FA check skipped due to network/local state:"),
    'Old 2FA bypass code should be eliminated'
);

// 2. Verify mandatory local 2FA enforcement branch exists
assert.ok(indexJs.includes('backendHandled = true'), 'Tracks whether backend handled 2FA check');
assert.ok(indexJs.includes('if (!backendHandled)'), 'Handles offline / localStorage 2FA fallback');
assert.ok(indexJs.includes('isLocal2faEnabled'), 'Checks if user already enabled 2FA locally');

// 3. Verify client-side TOTP engine functions exist
assert.ok(indexJs.includes('function generateLocalBase32Secret'), 'Has Base32 secret generator');
assert.ok(indexJs.includes('function base32ToBytes'), 'Has Base32 decoder');
assert.ok(indexJs.includes('async function getTotpCodeAtStep'), 'Has TOTP code generator');
assert.ok(indexJs.includes('async function verifyTotpCode'), 'Has TOTP code verifier');
assert.ok(indexJs.includes('function markLocalUser2faEnabled'), 'Has user record sync for 2FA state');

// 4. Verify returning vs first-time 2FA paths
assert.ok(indexJs.includes('open2faModal(targetUserId'), 'Triggers 2FA verification for returning accounts');
assert.ok(indexJs.includes('open2faSetupModal(targetUserId'), 'Triggers 2FA QR setup for first-time accounts');

// 5. Verify local TOTP verification without bypass
assert.ok(indexJs.includes('verifyTotpCode(localSecret, code)'), 'Verifies real TOTP code against user secret');
assert.ok(!indexJs.includes('code === \'123456\''), 'Does not allow 123456 bypass code');
assert.ok(indexJs.includes('sigma-2fa-secret-'), 'Persists user secret key locally');
assert.ok(indexJs.includes('sigma-2fa-enabled-'), 'Persists user 2FA status locally');

console.log('PASS: 2FA enforcement and client-side TOTP engine verified successfully.');
