const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/admin.js'), 'utf8');
const start = source.indexOf('window.loadLoginSecuritySettings = function');
const load = source.slice(start, source.indexOf('window.canCurrentAdminManageMaintenance =', start));
const defaultNotice = 'System Maintenance in Progress / Pre-enrollment Period. The portal is currently restricted while Admins configure curriculum and sections.';
function exercise(saved, expected) {
    const input = { value: '', dataset: {} };
    const window = { getMaintenanceConfig: () => ({ enabled: false, message: defaultNotice }) };
    const context = { window, localStorage: { getItem: () => null },
        document: { getElementById: id => id === 'settings-maintenance-message' ? input : null },
        getStoredJson: () => saved };
    vm.createContext(context);
    vm.runInContext(load, context);
    window.loadLoginSecuritySettings();
    assert.equal(input.value, expected);
    input.value = '';
    window.loadLoginSecuritySettings();
    assert.equal(input.value, '', 'Repeated loads must not refill a cleared draft');
}
exercise({}, '');
exercise({ message: defaultNotice }, '');
exercise({ message: 'Scheduled maintenance tonight.' }, 'Scheduled maintenance tonight.');
console.log('Blank notice defaults, saved custom notices, and cleared drafts passed');
