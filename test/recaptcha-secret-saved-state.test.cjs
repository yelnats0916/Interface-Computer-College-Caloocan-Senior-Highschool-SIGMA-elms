const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/admin.js'), 'utf8');
const input = { value: '', placeholder: '' };
const hint = { textContent: '' };
const context = { window: {}, document: { getElementById(id) {
    return id === 'recaptcha-page-secret-key-input' ? input : hint;
} } };
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('    const recaptchaPageState ='),
    source.indexOf('    window.loadRecaptchaPageData =')), context);
const update = context.window.updateRecaptchaSecretSavedState;
assert.equal(update({ success: true, has_secret: true }, false), true);
assert.match(input.placeholder, /Saved secret key \(hidden\)/);
assert.match(hint.textContent, /saved on the server/);
assert.equal(input.value, '');
assert.equal(update({ success: true, has_secret: false }, true), false);
assert.match(hint.textContent, /browser only/);
assert.equal(update(null, true), true);
assert.match(hint.textContent, /Server storage is not confirmed/);
assert.equal(update(null, false), false);
assert.match(hint.textContent, /No saved secret key/);
assert.match(source, /if \(entry.secret_key\) payload.profiles\[type\].secret_key = entry.secret_key;/);
assert.match(source, /if \(secretKeyInput\) secretKeyInput.value = '';/);
console.log('Secret saved-state messaging and blank-key preservation passed');
