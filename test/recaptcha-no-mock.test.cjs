const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const markers = ['landingCaptchaCheck', 'modalCaptchaCheck', 'landingCaptchaVisual', 'modalCaptchaVisual',
    'recaptchaModalCheckbox', 'recaptchaModalLabel', 'recaptchaDiagBadge', 'login-captcha-box', 'setRecaptchaLoading'];
for (const file of ['index.html', 'admin.html', 'php/index.php', 'php/includes/system_settings_views.php', 'js/index.js', 'js/admin.js']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    for (const marker of markers) assert.equal(source.includes(marker), false, `${file}: remove ${marker}`);
}
for (const file of ['index.html', 'php/index.php']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    for (const id of ['landingRecaptchaContainer', 'modalRecaptchaContainer']) {
        assert.match(source, new RegExp(`<div id="${id}" class="hidden mb-6"><\/div>`));
    }
}
const admin = fs.readFileSync(path.join(root, 'js/admin.js'), 'utf8');
assert.match(admin, /window.SigmaRecaptcha.challenge\(host/);
assert.match(admin, /resetRecaptchaTestModal = function \(restart = true\)/);
console.log('Mock reCAPTCHA markup and state handlers removed; real widget mounts retained');
