const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/settings-view.css'), 'utf8');
const section = html.split('<section id="settings-recaptcha-view"')[1].split('</section>')[0];

assert.equal((section.match(/class="recaptcha-settings-section space-y-4"/g) || []).length, 3);
assert.equal((section.match(/class="recaptcha-detail-row space-y-1"/g) || []).length, 2);
assert.equal(section.includes('Site Key Status'), false);
assert.equal(section.includes('Secret Key Status'), false);
assert.match(section, />Active Version<\/span>/);
assert.match(section, />Protection<\/span>/);
assert.match(section, /<fieldset[^>]*recaptcha-version-options/);
assert.match(section, /<legend[^>]*>Select reCAPTCHA Version<\/legend>/);
for (const id of ['recaptcha-page-site-key-input', 'recaptcha-page-secret-key-input',
    'btn-page-test-recaptcha', 'btn-save-recaptcha-page-config']) {
    assert.equal((section.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1);
}
assert.match(section, /onclick="window.openRecaptchaTestModal\(\)"/);
assert.equal((section.match(/onclick="window.saveRecaptchaPageSettings\(\)"/g) || []).length, 1);
assert.equal(html.includes('id="btn-save-recaptcha-thresholds"'), false);
for (const id of ['recaptcha-page-threshold-input', 'recaptcha-page-enabled-toggle', 'recaptcha-defense-save-status']) {
    assert.equal(section.includes(`id="${id}"`), false);
    assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1);
}
assert.match(section, /id="recaptcha-protection-summary"/);
assert.match(css, /#settings-recaptcha-view \.recaptcha-settings-content\s*\{\s*max-width: 960px;/);
assert.match(css, /#settings-recaptcha-view \.recaptcha-settings-section\s*\{\s*padding: 20px 0;/);
console.log('reCAPTCHA settings layout and action hooks passed');
