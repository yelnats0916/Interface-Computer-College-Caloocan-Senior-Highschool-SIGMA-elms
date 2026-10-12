const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

for (const file of ['admin.html', 'php/includes/system_settings_views.php']) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const security = source.split('id="settings-security-view"')[1].split('<!-- Card 3:')[0];
    for (const title of ['reCAPTCHA Protection', 'Account Lockout']) {
        assert.ok(security.includes(`sigma-settings-cat-text text-inherit">${title}</span>`), file);
        assert.ok(security.includes(`sigma-panel-title">${title}</h2>`), file);
    }
    const lockout = security.split('id="sec-lockout-panel"')[1];
    assert.ok(lockout.includes('class="recaptcha-rule-row"'), file);
    assert.ok(lockout.includes('for="password-lockout-attempts"'), file);
    assert.ok(lockout.includes('aria-describedby="lockout-attempts-description"'), file);
    assert.ok(lockout.includes('value="8" max="50" min="1"'), file);
    assert.ok(lockout.includes('class="sigma-btn sigma-btn-primary sigma-btn-md">Save'), file);
    assert.ok(!lockout.includes('<i '), file);
    assert.ok(!lockout.includes('Save Policy'), file);
}
console.log('Security section labels and lockout controls passed');
