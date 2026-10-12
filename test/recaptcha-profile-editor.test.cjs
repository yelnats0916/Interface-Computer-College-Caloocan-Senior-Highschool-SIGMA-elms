const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/admin.js'), 'utf8');
function node() {
    const classes = new Set();
    return { value: '', type: 'password', checked: false, disabled: false, dataset: {},
        textContent: '', innerHTML: '', focus() {}, setAttribute() {},
        classList: { contains: key => classes.has(key), toggle(key, on) { if (on) classes.add(key); else classes.delete(key); } } };
}
const nodes = {};
const document = {
    getElementById(id) { return nodes[id] ||= node(); },
    querySelector(selector) { return selector.includes('v3') ? nodes.v3 : nodes.v2; }
};
nodes.v2 = node(); nodes.v3 = node();
for (const type of ['site', 'secret']) document.getElementById(`recaptcha-${type}-key-editor`).classList.toggle('hidden', true);
const storage = new Map();
let config = { success: true, version: 'v2', site_key: 'public-v2', has_secret: true, threshold: 3, enabled: true,
    profiles: { v2: { site_key: 'public-v2', has_secret: true }, v3: { site_key: 'public-v3', has_secret: true } } };
let failure = false;
const requests = [];
const context = { document, window: { showToast() {}, syncSettingsKeyEye() {} }, console, setTimeout, clearTimeout, history: { state: null }, resolveAuthApiUrl: () => '/test-api',
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    fetch: async (url, options) => {
        if (options) {
            const payload = JSON.parse(options.body);
            requests.push(payload);
            if (failure) return { ok: false, json: async () => ({ success: false, error: 'Test failure' }) };
            if (payload.scope === 'defense') config = { ...config, threshold: payload.threshold, enabled: payload.enabled };
            else {
                config.version = payload.version;
                for (const [type, profile] of Object.entries(payload.profiles)) {
                    config.profiles[type] = { site_key: profile.site_key, has_secret: config.profiles[type].has_secret || !!profile.secret_key };
                }
                config.site_key = config.profiles[config.version].site_key;
                config.has_secret = config.profiles[config.version].has_secret;
            }
        }
        return { ok: true, json: async () => JSON.parse(JSON.stringify(config)) };
    } };
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('    const recaptchaPageState ='),
    source.indexOf('    // \u2500\u2500\u2500 RECAPTCHA TEST MODAL LOGIC')), context);
const win = context.window;
const keysButton = () => nodes['btn-save-recaptcha-page-config'].disabled;
const rulesButton = () => nodes['btn-save-recaptcha-thresholds'].disabled;
(async () => {
    await win.loadRecaptchaPageData();
    assert.equal(keysButton(), true); assert.equal(rulesButton(), true);
    win.onRecaptchaVersionChanged('v3');
    assert.equal(nodes['recaptcha-page-site-key-input'].value, 'public-v3');
    assert.equal(keysButton(), false); assert.equal(rulesButton(), true);
    assert.equal(nodes['recaptcha-page-display-version'].textContent, 'v2 (Checkbox)');
    win.onRecaptchaVersionChanged('v2');
    assert.equal(keysButton(), true);
    win.setRecaptchaKeyEditing('site', true);
    nodes['recaptcha-page-site-key-input'].value = 'edited-v2';
    win.updateRecaptchaSaveButtons(); assert.equal(keysButton(), false);
    win.setRecaptchaKeyEditing('site', false); assert.equal(keysButton(), true);
    nodes['recaptcha-page-threshold-input'].value = '4';
    win.updateRecaptchaSaveButtons(); assert.equal(rulesButton(), false); assert.equal(keysButton(), true);
    nodes['recaptcha-page-threshold-input'].value = '3';
    win.updateRecaptchaSaveButtons(); assert.equal(rulesButton(), true);
    win.setRecaptchaKeyEditing('secret', true);
    nodes['recaptcha-page-secret-key-input'].value = 'dummy-replacement-v2';
    win.updateRecaptchaSaveButtons();
    win.onRecaptchaVersionChanged('v3');
    assert.equal(nodes['recaptcha-page-secret-key-input'].value, '');
    win.onRecaptchaVersionChanged('v2');
    assert.equal(nodes['recaptcha-page-secret-key-input'].value, 'dummy-replacement-v2');
    failure = true;
    await win.saveRecaptchaPageSettings();
    assert.equal(nodes['recaptcha-page-secret-key-input'].value, 'dummy-replacement-v2');
    assert.equal(keysButton(), false);
    for (const value of storage.values()) assert.equal(value.includes('dummy-replacement-v2'), false);
    failure = false;
    nodes['recaptcha-page-threshold-input'].value = '4';
    win.onRecaptchaVersionChanged('v3');
    await win.saveRecaptchaPageSettings();
    assert.equal(config.version, 'v3');
    assert.equal(config.profiles.v2.site_key, 'public-v2');
    assert.equal(keysButton(), true); assert.equal(rulesButton(), false);
    assert.equal(Number(nodes['recaptcha-page-threshold-input'].value), 4);
    for (const value of storage.values()) assert.equal(value.includes('dummy-replacement-v2'), false);
    await win.saveRecaptchaPageSettings('defense');
    assert.equal(rulesButton(), true);
    assert.equal(requests.at(-1).scope, 'defense');
    assert.equal(requests.at(-1).profiles, undefined);
    win.setRecaptchaKeyEditing('site', true);
    nodes['recaptcha-page-site-key-input'].value = 'unsaved-public-v3';
    nodes['recaptcha-page-threshold-input'].value = '5';
    win.updateRecaptchaSaveButtons();
    await win.saveRecaptchaPageSettings('defense');
    assert.equal(config.profiles.v3.site_key, 'public-v3');
    assert.equal(nodes['recaptcha-page-site-key-input'].value, 'unsaved-public-v3');
    assert.equal(keysButton(), false); assert.equal(rulesButton(), true);
    win.setRecaptchaKeyEditing('site', false);
    const count = requests.length;
    await win.saveRecaptchaPageSettings();
    await win.saveRecaptchaPageSettings('defense');
    assert.equal(requests.length, count);
    config.profiles.v2 = { site_key: '', has_secret: false };
    await win.loadRecaptchaPageData();
    win.onRecaptchaVersionChanged('v2');
    assert.equal(nodes['recaptcha-page-site-key-input'].value, '');
    const beforeInvalidSave = requests.length;
    await win.saveRecaptchaPageSettings();
    assert.equal(requests.length, beforeInvalidSave);
    assert.equal(config.version, 'v3');
    nodes['recaptcha-page-threshold-input'].value = '6';
    win.scheduleRecaptchaDefenseSave();
    nodes['recaptcha-page-threshold-input'].value = '7';
    win.scheduleRecaptchaDefenseSave();
    const beforeAuto = requests.length;
    await new Promise(resolve => setTimeout(resolve, 550));
    assert.equal(requests.length, beforeAuto + 1);
    assert.equal(config.threshold, 7);
    assert.equal(nodes['recaptcha-defense-save-status'].textContent, 'Saved');
    nodes['recaptcha-page-enabled-toggle'].checked = false;
    win.scheduleRecaptchaDefenseSave(true);
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(config.enabled, false);
    const beforeInvalid = requests.length;
    nodes['recaptcha-page-threshold-input'].value = '';
    win.scheduleRecaptchaDefenseSave();
    await new Promise(resolve => setTimeout(resolve, 550));
    assert.equal(requests.length, beforeInvalid);
    nodes['recaptcha-page-threshold-input'].value = '8';
    failure = true;
    win.scheduleRecaptchaDefenseSave(true);
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(Number(nodes['recaptcha-page-threshold-input'].value), 7);
    assert.match(nodes['recaptcha-defense-save-status'].textContent, /reverted/);
    assert.equal(nodes['recaptcha-page-threshold-input'].disabled, false);
    console.log('reCAPTCHA drafts, autosave debounce/toggle, invalid input, failure rollback and secret-free caching passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
