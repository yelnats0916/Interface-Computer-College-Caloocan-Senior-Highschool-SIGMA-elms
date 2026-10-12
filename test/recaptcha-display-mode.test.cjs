const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/admin.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
const elements = {};
function node(hidden = false) {
    const classes = new Set(hidden ? ['hidden'] : []);
    return { value: '', type: 'password', dataset: {}, textContent: '',
        focus() {}, setAttribute() {}, classList: {
            contains: name => classes.has(name),
            toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); }
        } };
}
for (const kind of ['site', 'secret']) {
    elements[`recaptcha-page-${kind}-key-input`] = node();
    elements[`recaptcha-${kind}-key-editor`] = node(true);
    elements[`recaptcha-${kind}-key-display`] = node();
    elements[`recaptcha-${kind}-key-value`] = node();
    elements[`btn-toggle-recaptcha-${kind}`] = node();
    assert.match(html, new RegExp(`id="recaptcha-${kind}-key-editor" class="hidden`));
}
assert.equal(html.includes('id="btn-display-recaptcha-site"'), false);
elements['btn-edit-recaptcha-secret'] = node();
const context = { window: { syncSettingsKeyEye() {} }, history: { state: null }, document: { getElementById: id => elements[id] } };
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('    const recaptchaPageState ='),
    source.indexOf('    // \u2500\u2500\u2500 RECAPTCHA TEST MODAL LOGIC')), context);
const site = elements['recaptcha-page-site-key-input'];
site.value = 'public-test-key';
context.window.setRecaptchaKeyVisibility('site', false);
assert.notEqual(elements['recaptcha-site-key-value'].textContent, site.value);
context.window.toggleRecaptchaKeyVisibility('site');
assert.notEqual(elements['recaptcha-site-key-value'].textContent, site.value);
context.window.setRecaptchaKeyEditing('site', true);
assert.equal(site.type, 'password');
assert.equal(elements['recaptcha-site-key-display'].classList.contains('hidden'), true);
context.window.toggleRecaptchaKeyVisibility('site');
assert.equal(site.type, 'text');
assert.notEqual(elements['recaptcha-site-key-value'].textContent, site.value);
site.value = 'edited-test-key';
context.window.setRecaptchaKeyEditing('site', false);
assert.equal(site.value, 'public-test-key');
assert.equal(elements['recaptcha-site-key-editor'].classList.contains('hidden'), true);
context.window.setRecaptchaKeyEditing('secret', true);
const secret = elements['recaptcha-page-secret-key-input'];
secret.value = 'replacement-test-key';
context.window.toggleRecaptchaSecretVisibility();
context.window.setRecaptchaKeyEditing('secret', false);
assert.equal(secret.value, '');
assert.equal(secret.type, 'password');
assert.equal(elements['recaptcha-secret-key-editor'].classList.contains('hidden'), true);
context.window.updateRecaptchaSecretSavedState({ has_secret: true });
assert.equal(elements['recaptcha-secret-key-value'].textContent, 'Secret key configured');
assert.equal(elements['btn-edit-recaptcha-secret'].textContent, 'Replace Key');
context.window.updateRecaptchaSecretSavedState({ has_secret: false });
assert.equal(elements['recaptcha-secret-key-value'].textContent, 'Not configured');
assert.equal(elements['btn-edit-recaptcha-secret'].textContent, 'Add Key');
console.log('Key display mode, masked editing, and cancellation passed');
