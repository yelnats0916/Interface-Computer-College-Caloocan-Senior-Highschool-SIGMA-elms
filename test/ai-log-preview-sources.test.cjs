const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/ai-log-preview.js'), 'utf8');
const storage = new Map([
    ['sigma-ai-preview-logs', JSON.stringify([{ id: 'preview-1', evidenceSources: [{ label: 'Sample source' }] }])],
    ['sigma-ai-recorded-logs', 'real-records'],
    ['sigma-notification-logs-v1', 'notification-records'],
    ['sigma-admin-users', 'user-records']
]);
let events = 0;
const context = { document: { getElementById: () => ({}) }, localStorage: { getItem: key => storage.get(key) ?? null, removeItem: key => storage.delete(key) }, window: { dispatchEvent() { events++; } }, Event: class {}, console };
vm.runInNewContext(source, context);
assert(!storage.has('sigma-ai-preview-logs'));
assert.equal(storage.get('sigma-ai-recorded-logs'), 'real-records');
assert.equal(storage.get('sigma-notification-logs-v1'), 'notification-records');
assert.equal(storage.get('sigma-admin-users'), 'user-records');
vm.runInNewContext(source, context);
assert.equal(events, 1, 'Cleanup is idempotent and samples do not reappear');
console.log('PASS: removes only legacy AI preview rows/sources, preserves real logs and other data, never recreates samples');
