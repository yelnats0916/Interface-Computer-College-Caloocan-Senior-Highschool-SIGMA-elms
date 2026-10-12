const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../js/admin.js'), 'utf8').replace(/\r/g, '');
const start = source.indexOf("} else if (hash === 'settings' || hash.startsWith('settings-')");
const end = source.indexOf("\n    }\n\n    window.addEventListener('popstate'", start);
assert.ok(start > 0 && end > start);
const branch = 'if (false) {' + source.slice(start, end);
for (const [hash, expected] of [
    ['nav-settings-security', 'nav-settings-security'],
    ['nav-settings-branding', 'nav-settings-branding'],
    ['nav-settings-integrations', 'nav-settings-integrations'],
    ['settings-security', 'nav-settings-security'],
    ['settings', 'nav-settings-security'],
    ['system-settings', 'nav-settings-security'],
    ['nav-dashboard', 'nav-dashboard'],
    ['dashboard', 'nav-dashboard']
]) {
    let actual;
    vm.runInNewContext(branch, { hash, window: { switchTab(tab) { actual = tab; } } });
    assert.equal(actual, expected, hash);
}
console.log('PASS: Settings routes and existing nav prefixes resolve correctly');
for (const title of ['SIGMA AI Integration Engines', 'Google Drive Cloud Storage', 'Google reCAPTCHA Protection', 'File Upload Size Limits']) {
    assert.ok(source.includes("window.setPortalHeader('System Settings', '" + title + "')"), 'Navbar must match panel title: ' + title);
    assert.ok(source.includes('<span class="breadcrumb-topic">' + title + '</span>'), 'Fallback navbar must retain breadcrumb styling: ' + title);
}
assert.ok(!source.includes("setPortalHeader('System Settings', 'AI Integration Engines')"));
assert.ok(!source.includes("setPortalHeader('System Settings', 'Google reCAPTCHA')"));
