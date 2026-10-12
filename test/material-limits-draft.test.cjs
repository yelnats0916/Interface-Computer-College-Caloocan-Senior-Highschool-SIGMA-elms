const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/admin.js'), 'utf8');
const start = source.indexOf('    // --- MATERIAL LIMITS MANAGEMENT ---');
const end = source.indexOf('    initMaterialLimits();', start) + '    initMaterialLimits();'.length;
const fields = Object.fromEntries(['limit-video-embed', 'limit-video-mp4', 'limit-video-ext', 'limit-docx-std', 'limit-docx-ext', 'limit-pdf-std', 'limit-pdf-ext', 'limit-pptx-std', 'limit-pptx-ext'].map(id => [id, { reportValidity: () => true }]));
Object.values(fields).forEach(field => {
    let value = '';
    Object.defineProperty(field, 'value', { get: () => value, set: next => { value = String(next); } });
});
const restore = {}, status = {}, handlers = {};
const panel = { addEventListener(type, handler) { handlers[type] = handler; } };
const store = new Map();
let failSave = false, failMirror = false;
const window = {
    location: { href: 'http://localhost/admin.html#nav-settings-integrations' },
    history: { state: {} },
    showToast() { throw new Error('File limits must not use toasts'); }
};
const context = vm.createContext({ window, URL, document: {
    getElementById(id) { return fields[id] || ({ 'limits-restore-btn': restore, 'limits-save-status': status, 'integ-limits-panel': panel })[id]; },
    querySelectorAll: () => Object.values(fields)
}, localStorage: {
    getItem: key => store.get(key) ?? null,
    setItem(key, value) { if (failSave || (failMirror && key === 'sigma_settings_video_max_mb')) throw new Error('Full'); store.set(key, value); },
    removeItem: key => store.delete(key)
}});
vm.runInContext(source.slice(start, end), context);
assert.equal(store.size, 0);
assert.equal(restore.hidden, true);
fields['limit-video-mp4'].value = '350';
handlers.change();
assert.equal(JSON.parse(store.get('sigma-material-limits')).video.mp4, 350);
assert.equal(restore.hidden, false);
assert.equal(window.materialLimitsAreDirty(), false);
assert.equal(status.textContent, '');
assert.equal(window.confirmMaterialLimitsLeave(), true);
fields['limit-pdf-std'].value = '35';
handlers.change();
assert.equal(JSON.parse(store.get('sigma-material-limits')).pdf.std, 35);
assert.equal(JSON.parse(store.get('sigma-material-limits')).video.mp4, 350);
window.restoreMaterialLimitsDefaults();
assert.equal(fields['limit-video-mp4'].value, '200');
assert.equal(fields['limit-pdf-std'].value, '25');
assert.equal(restore.hidden, true);
assert.equal(JSON.parse(store.get('sigma-material-limits')).video.embed, 30);
fields['limit-docx-std'].value = '30';
handlers.change();
window.initMaterialLimits();
assert.equal(fields['limit-docx-std'].value, '30');
assert.equal(restore.hidden, false, 'Restore remains visible for saved nondefault limits');
failSave = true;
fields['limit-docx-std'].value = '10';
handlers.change();
assert.equal(fields['limit-docx-std'].value, '30');
assert.match(status.textContent, /reverted/);
assert.equal(window.materialLimitsAreDirty(), false);
failSave = false; failMirror = true;
fields['limit-video-mp4'].value = '500';
handlers.change();
assert.equal(fields['limit-video-mp4'].value, '200');
assert.equal(JSON.parse(store.get('sigma-material-limits')).video.mp4, 200);
failMirror = false;
fields['limit-pdf-std'].reportValidity = () => false;
fields['limit-pdf-std'].value = '';
handlers.change();
assert.equal(JSON.parse(store.get('sigma-material-limits')).pdf.std, 25);
for (const file of ['admin.html', 'php/includes/system_settings_views.php']) {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.equal(html.includes('id="limits-save-btn"'), false);
    assert.ok(html.includes('id="limits-restore-btn"'));
    assert.ok(html.includes('window.restoreMaterialLimitsDefaults()'));
}
console.log('File limits autosave passed: immediate save, default visibility/restore, reload, validation, storage rollback and no Save button.');
