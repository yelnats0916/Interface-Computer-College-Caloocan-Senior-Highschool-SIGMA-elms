const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/admin.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
const elements = {};
for (const kind of ['site', 'secret']) {
    elements[`recaptcha-page-${kind}-key-input`] = { type: 'password', value: 'dummy-test-key' };
    elements[`btn-toggle-recaptcha-${kind}`] = {
        textContent: '', attributes: {},
        querySelector() { return { classList: { toggle() {} } }; },
        setAttribute(name, value) { this.attributes[name] = value; }
    };
    elements[`recaptcha-page-${kind}-key-input`].parentElement = { querySelector: () => elements[`btn-toggle-recaptcha-${kind}`] };
    assert.match(html, new RegExp(`type="password" id="recaptcha-page-${kind}-key-input"`));
}
const context = { window: {}, document: { getElementById: id => elements[id] } };
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('    window.syncSettingsKeyEye ='),
    source.indexOf('    let aiKeyEditor =')), context);
vm.runInContext(source.slice(source.indexOf('    const recaptchaPageState ='),
    source.indexOf('    // \u2500\u2500\u2500 RECAPTCHA TEST MODAL LOGIC')), context);
for (const kind of ['site', 'secret']) {
    const input = elements[`recaptcha-page-${kind}-key-input`];
    const button = elements[`btn-toggle-recaptcha-${kind}`];
    for (let i = 0; i < 3; i++) {
        context.window.toggleRecaptchaKeyVisibility(kind);
        assert.equal(input.type, 'text');
        assert.equal(button.attributes['aria-label'], 'Hide key');
        assert.equal(button.attributes['aria-pressed'], 'true');
        context.window.toggleRecaptchaKeyVisibility(kind);
        assert.equal(input.type, 'password');
        assert.equal(button.attributes['aria-label'], 'Show key');
        assert.equal(button.attributes['aria-pressed'], 'false');
    }
    context.window.toggleRecaptchaKeyVisibility(kind);
    context.window.setRecaptchaKeyVisibility(kind, false);
    assert.equal(input.type, 'password');
    assert.equal(input.value, 'dummy-test-key');
}
context.window.toggleRecaptchaSecretVisibility();
assert.equal(elements['recaptcha-page-secret-key-input'].type, 'text');
assert.equal(elements['recaptcha-page-site-key-input'].type, 'password');
assert.match(source, /loadRecaptchaPageData = async function \(\) \{[\s\S]*?window.setRecaptchaKeyEditing\('site', false\);\s*window.setRecaptchaKeyEditing\('secret', false\);\s*window.setRecaptchaKeyVisibility\('site', false\);\s*window.setRecaptchaKeyVisibility\('secret', false\);/);
console.log('reCAPTCHA key masking, independent toggles, and page-entry reset passed');
