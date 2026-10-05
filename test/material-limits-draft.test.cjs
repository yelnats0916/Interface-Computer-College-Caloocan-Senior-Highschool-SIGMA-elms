const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/admin.js'), 'utf8');
const start = source.indexOf('    // --- MATERIAL LIMITS MANAGEMENT ---');
const end = source.indexOf('    initMaterialLimits();', start) + '    initMaterialLimits();'.length;
const fields = Object.fromEntries(['limit-video-embed', 'limit-video-mp4', 'limit-video-ext', 'limit-docx-std', 'limit-docx-ext', 'limit-pdf-std', 'limit-pdf-ext', 'limit-pptx-std', 'limit-pptx-ext'].map(id => [id, { value: '', reportValidity: () => true }]));
Object.values(fields).forEach(field => {
    let value = '';
    Object.defineProperty(field, 'value', { get: () => value, set: next => { value = String(next); } });
});
const icon = {}, label = {}, button = { querySelector: s => s === 'i' ? icon : label };
const status = {};
const panel = { addEventListener() {} };
const store = new Map();
const listeners = {};
let askingPanel;
let failSave = false;
const window = {
    location: { href: 'http://localhost/admin.html#nav-settings-integrations' },
    history: { state: {}, replaceState(state, _, href) { window.location.href = href; } },
    confirm() { throw new Error('Must use the shared Asking Panel, not native confirm'); },
    openAskingPanel(options) { askingPanel = options; },
    showToast() { throw new Error('File limits must not use toasts'); },
    addEventListener(type, fn) { listeners[type] = fn; }
};
const context = vm.createContext({ window, URL, document: {
    getElementById(id) { return fields[id] || ({ 'limits-save-btn': button, 'limits-save-status': status, 'integ-limits-panel': panel })[id]; },
    querySelector: () => button,
    querySelectorAll: () => Object.values(fields)
}, localStorage: {
    getItem: key => store.get(key) || null,
    setItem(key, value) { if (failSave) throw new Error('Full'); store.set(key, value); }
}});
vm.runInContext(source.slice(start, end), context);
assert.equal(store.size, 0);
fields['limit-video-mp4'].value = '700';
window.updateMaterialLimitsButtonState();
assert.equal(button.disabled, false);
assert.equal(status.textContent, 'Unsaved changes');
assert.equal(store.size, 0, 'Editing must not persist');
assert.equal(window.confirmMaterialLimitsLeave(), false);
assert.equal(fields['limit-video-mp4'].value, '700');
assert.equal(askingPanel.cancelText, 'Keep Editing');
askingPanel.onConfirm();
assert.equal(String(fields['limit-video-mp4'].value), '500');
assert.equal(store.size, 0, 'Discard must not persist');
fields['limit-video-mp4'].value = '700';
window.saveMaterialLimits();
assert.equal(JSON.parse(store.get('sigma-material-limits')).video.mp4, 700);
assert.equal(window.materialLimitsAreDirty(), false);
fields['limit-video-mp4'].value = '250';
window.updateMaterialLimitsButtonState();
assert.equal(window.materialLimitsAreDirty(), true, 'New edits after saving must stay drafts');
assert.equal(JSON.parse(store.get('sigma-material-limits')).video.mp4, 700);
assert.equal(listeners.beforeunload, undefined, 'Do not trigger the browser reload popup');
askingPanel = null;
window.location.href = 'http://localhost/admin.html#nav-settings-storage';
assert.equal(window.guardMaterialLimitsHistory(), true, 'Same-page aliases must not ask');
assert.equal(askingPanel, null);
window.location.href = 'http://localhost/admin.html#dashboard';
assert.equal(window.guardMaterialLimitsHistory(), false);
assert.equal(askingPanel.confirmText, 'Discard Changes');
assert.ok(window.location.href.endsWith('#nav-settings-integrations'));
failSave = true;
window.saveMaterialLimits();
assert.equal(window.materialLimitsAreDirty(), true);
assert.equal(button.disabled, false);
assert.equal(status.textContent, 'Could not save. Your changes are still unsaved.');
let navigated = false;
askingPanel.onConfirm();
assert.ok(window.location.href.endsWith('#dashboard'));
assert.equal(window.materialLimitsAreDirty(), false);
fields['limit-video-mp4'].value = '500';
assert.equal(window.confirmMaterialLimitsLeave(() => { navigated = true; }), false);
askingPanel.onConfirm();
assert.equal(navigated, true);
const scrollFunction = source.slice(source.indexOf('window.scrollToSettingsSection ='), source.indexOf('window.scrollToSettingsSection =') + 350);
assert.ok(!scrollFunction.includes('confirmMaterialLimitsLeave'), 'Section selections only scroll; they must not ask');
console.log('PASS: explicit save, shared Asking Panel, no native reload popup or toast, same-page selections, history and failed save');
